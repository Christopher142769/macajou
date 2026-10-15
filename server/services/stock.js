const Macajou = require('../models/Macajou');
const Coffret = require('../models/Coffret');

/** Stock illimité quand `stock` est null/absent. */
function hasStock(doc, qty) {
  return doc.stock == null || doc.stock >= qty;
}

/**
 * Décrémente le stock d'un document de façon atomique.
 * Renvoie false si le stock est insuffisant (rien n'est modifié).
 */
async function take(Model, id, qty) {
  const doc = await Model.findById(id).select('stock');
  if (!doc || doc.stock == null) return true;
  const res = await Model.updateOne({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
  return res.modifiedCount === 1;
}

async function give(Model, id, qty) {
  const doc = await Model.findById(id).select('stock');
  if (!doc || doc.stock == null) return;
  await Model.updateOne({ _id: id }, { $inc: { stock: qty } });
}

/** Lignes de stock à déduire pour une commande résolue : [{ Model, id, qty }]. */
function stockLines(items) {
  const lines = [];
  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    if (item.coffret) lines.push({ Model: Coffret, id: item.coffret, qty });
    for (const c of item.composition || []) {
      if (c.macajou) lines.push({ Model: Macajou, id: c.macajou, qty: (Number(c.quantity) || 0) * qty });
    }
  }
  return lines;
}

async function reserve(items) {
  const taken = [];
  for (const line of stockLines(items)) {
    if (await take(line.Model, line.id, line.qty)) {
      taken.push(line);
    } else {
      for (const t of taken) await give(t.Model, t.id, t.qty);
      return false;
    }
  }
  return true;
}

async function release(items) {
  for (const line of stockLines(items)) await give(line.Model, line.id, line.qty);
}

module.exports = { hasStock, reserve, release };
