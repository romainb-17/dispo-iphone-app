import nodemailer from 'nodemailer';
import { checkQueue, startCheckWorker } from '../queue.js';
import { listSubscriptions, saveSubscriptions } from './subscriptions.js';
import { checkAvailability } from './check.js';
const POLL_MINUTES = parseInt(process.env.POLL_MINUTES || '2', 10);

function buildTransport(){
  if (!process.env.SMTP_HOST) {
    return { sendMail: async (opts)=>{ console.log(`--- EMAIL (simulé) ---
To: ${opts.to}
Subject: ${opts.subject}
Text: ${opts.text}
------------------------`); return { accepted:[opts.to] }; } };
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587',10),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

async function sendNotification(transporter, sub, results){
  const okStores = results.filter(r=>r.status==='ok');
  if (!okStores.length) return false;
  const subject = `Dispo iPhone: ${sub.model} ${sub.capacity} ${sub.color} — en stock près de ${sub.postal}`;
  const lines = okStores.slice(0,8).map(s => `• ${s.name} (${s.city}) — Retrait: ${s.pickup}`);
  const text = `Bonne nouvelle ! Des magasins ont du stock:\n\n${lines.join('\n')}\n\nAstuce: réserve vite en ligne avant que ça parte.`;
  const from = process.env.MAIL_FROM || 'dispo-iphone@example.com';
  await transporter.sendMail({ from, to: sub.email, subject, text });
  return true;
}

export function startWorker(){
  const transporter = buildTransport();
  console.log(`🔁 Worker / Queue prêts (intervalle ${POLL_MINUTES} min)`);

  startCheckWorker(async ({ subId })=>{
    const subs = await listSubscriptions();
    const sub = subs.find(s=>s.id===subId);
    if (!sub || !sub.active) return;
    const results = await checkAvailability({ model: sub.model, capacity: sub.capacity, color: sub.color, postal: sub.postal, operator: sub.operator, onlyAvailable: true });
    const last = sub.lastNotifiedAt ? Date.now()-new Date(sub.lastNotifiedAt).getTime() : Infinity;
    if (results.length && last > 6*3600*1000) {
      const sent = await sendNotification(transporter, sub, results);
      if (sent) { sub.lastNotifiedAt = new Date().toISOString(); await saveSubscriptions(subs); }
    }
  });

  // planifie les jobs récurrents
  (async function scheduleAll(){
    const subs = await listSubscriptions();
    for (const sub of subs) {
      if (!sub.active) continue;
      await checkQueue.add(`check:${sub.id}`, { subId: sub.id }, { repeat: { every: POLL_MINUTES * 60 * 1000 }, removeOnComplete: true, removeOnFail: true });
    }
  })();
}
