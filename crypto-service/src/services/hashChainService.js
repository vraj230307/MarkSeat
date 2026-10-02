const crypto = require('crypto');
const db = require('../config/database');

const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes SHA-256 hash for a block entry.
 */
function computeBlockHash(blockIndex, timestamp, eventType, ticketId, detailsStr, previousHash) {
  const payload = `${blockIndex}:${timestamp}:${eventType}:${ticketId}:${detailsStr}:${previousHash}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Appends a new lifecycle event to the audit hash chain.
 * 
 * @param {string} eventType - Event type ('seat_selected', 'seat_held', 'payment_confirmed', 'ticket_issued', 'ticket_revoked')
 * @param {string} ticketId - Identifier of ticket
 * @param {Object} detailsObj - Event metadata
 * @returns {Object} Appended block record
 */
function appendHashBlock(eventType, ticketId, detailsObj = {}) {
  const lastBlock = db.prepare('SELECT * FROM audit_hash_chain ORDER BY block_index DESC LIMIT 1').get();

  const blockIndex = lastBlock ? lastBlock.block_index + 1 : 0;
  const previousHash = lastBlock ? lastBlock.current_hash : GENESIS_PREVIOUS_HASH;
  const timestamp = new Date().toISOString();
  const detailsStr = JSON.stringify(detailsObj);

  const currentHash = computeBlockHash(blockIndex, timestamp, eventType, ticketId, detailsStr, previousHash);

  const stmt = db.prepare(`
    INSERT INTO audit_hash_chain (block_index, timestamp, event_type, ticket_id, details, previous_hash, current_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(blockIndex, timestamp, eventType, ticketId, detailsStr, previousHash, currentHash);

  console.log(`[Hash Chain] Block #${blockIndex} logged: [${eventType}] Ticket: ${ticketId} | Hash: ${currentHash.substring(0, 12)}...`);

  return {
    block_index: blockIndex,
    timestamp,
    event_type: eventType,
    ticket_id: ticketId,
    details: detailsObj,
    previous_hash: previousHash,
    current_hash: currentHash
  };
}

/**
 * Walks the full audit hash chain and verifies hash integrity and unbroken links.
 * 
 * @returns {Object} Integrity result { isValid: boolean, totalBlocks: number, tamperedBlockIndex: number|null, reason: string }
 */
function verifyHashChain() {
  const blocks = db.prepare('SELECT * FROM audit_hash_chain ORDER BY block_index ASC').all();

  if (blocks.length === 0) {
    return { isValid: true, totalBlocks: 0, tamperedBlockIndex: null, reason: 'Chain is empty.' };
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const expectedPreviousHash = i === 0 ? GENESIS_PREVIOUS_HASH : blocks[i - 1].current_hash;

    // Check link continuity
    if (block.previous_hash !== expectedPreviousHash) {
      return {
        isValid: false,
        totalBlocks: blocks.length,
        tamperedBlockIndex: block.block_index,
        reason: `Broken chain link at Block #${block.block_index}. Stored previous_hash (${block.previous_hash.substring(0, 10)}...) does not match previous block hash (${expectedPreviousHash.substring(0, 10)}...).`
      };
    }

    // Re-compute expected current hash
    const recomputedHash = computeBlockHash(
      block.block_index,
      block.timestamp,
      block.event_type,
      block.ticket_id,
      block.details,
      block.previous_hash
    );

    if (block.current_hash !== recomputedHash) {
      return {
        isValid: false,
        totalBlocks: blocks.length,
        tamperedBlockIndex: block.block_index,
        reason: `Tampered content at Block #${block.block_index}. Stored current_hash (${block.current_hash.substring(0, 10)}...) does not match recomputed hash (${recomputedHash.substring(0, 10)}...).`
      };
    }
  }

  return {
    isValid: true,
    totalBlocks: blocks.length,
    tamperedBlockIndex: null,
    reason: `All ${blocks.length} blocks verified successfully. Hash chain is 100% intact.`
  };
}

module.exports = {
  appendHashBlock,
  verifyHashChain,
  computeBlockHash
};
