// api/ics.js — Vercel serverless function
// Vygeneruje ICS soubor za běhu podle parametrů z URL
// Použití: /api/ics?club=Love+Them+RC&place=...&time=19:00&...

export default function handler(req, res) {
  const q = req.query;

  const summary  = q.summary  || q.club || 'Runspot běh';
  const location = q.location || '';
  const city     = q.city     || '';
  const time     = q.time     || '18:00';
  const end      = q.end      || '';
  const km       = q.km       || '';
  const weekday  = q.weekday  !== undefined ? parseInt(q.weekday) : undefined;
  const firstWd  = q.firstWd  !== undefined ? parseInt(q.firstWd) : undefined;
  const club     = q.club     || summary;

  function pad(n) { return String(n).padStart(2, '0'); }

  // Anchor DTSTART — nejbližší výskyt od dneška
  const now = new Date();

  function nextWeekday(wd) {
    const d = new Date(now);
    let diff = (wd - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function firstWeekdayOfMonth(wd) {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    while (d.getDay() !== wd) d.setDate(d.getDate() + 1);
    // Pokud už proběhl, příští měsíc
    const [h, m] = time.split(':').map(Number);
    const dt = new Date(d);
    dt.setHours(h, m, 0, 0);
    if (dt < now) {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      while (next.getDay() !== wd) next.setDate(next.getDate() + 1);
      return next;
    }
    return d;
  }

  let anchor;
  if (weekday !== undefined) {
    anchor = nextWeekday(weekday);
  } else if (firstWd !== undefined) {
    anchor = firstWeekdayOfMonth(firstWd);
  } else {
    anchor = now;
  }

  const [sh, sm] = time.split(':').map(Number);
  const endTime  = end || `${String(sh + 1).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
  const [eh, em] = endTime.split(':').map(Number);

  const y = anchor.getFullYear();
  const mo = anchor.getMonth() + 1;
  const d  = anchor.getDate();

  const dtStart = `${y}${pad(mo)}${pad(d)}T${pad(sh)}${pad(sm)}00`;
  const dtEnd   = `${y}${pad(mo)}${pad(d)}T${pad(eh)}${pad(em)}00`;

  const DAY_NAMES = ['SU','MO','TU','WE','TH','FR','SA'];
  let rrule = '';
  if (weekday !== undefined) {
    rrule = `RRULE:FREQ=WEEKLY;BYDAY=${DAY_NAMES[weekday]}`;
  } else if (firstWd !== undefined) {
    rrule = `RRULE:FREQ=MONTHLY;BYDAY=1${DAY_NAMES[firstWd]}`;
  }

  const uid  = `runspot-${summary.replace(/\s+/g,'-').toLowerCase()}-${city}@runspot.eu`;
  const desc = `${club}${km ? ' · ' + km + ' km' : ''}${city ? ' · ' + city : ''}\nrunspot.eu`;
  const loc  = location + (city ? ', ' + city : '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Runspot//runspot.eu//CS',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    rrule,
    `SUMMARY:${summary}`,
    `LOCATION:${loc}`,
    `DESCRIPTION:${desc}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const filename = `runspot-${summary.replace(/[^a-z0-9]/gi,'-').toLowerCase()}.ics`;

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).send(lines);
}
