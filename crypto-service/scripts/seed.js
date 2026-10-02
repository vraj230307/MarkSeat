const { issueTicket } = require('../src/services/ticketService');
const { verifyHashChain } = require('../src/services/hashChainService');

function seedDatabase() {
  console.log(`\n================================================================`);
  console.log(`🌱 Seeding Demo Tickets for "IND vs PAK T20 — Demo Event"...`);
  console.log(`================================================================\n`);

  const demoTickets = [
    {
      email: 'rahul.sharma@example.com',
      event_id: 'evt_ind_pak_2026',
      event_name: 'IND vs PAK T20 — Demo Event',
      section: 'Sec 112',
      row: 'Row J',
      seat_number: 'Seat 14'
    },
    {
      email: 'priya.patel@example.com',
      event_id: 'evt_ind_pak_2026',
      event_name: 'IND vs PAK T20 — Demo Event',
      section: 'Sec 112',
      row: 'Row J',
      seat_number: 'Seat 15'
    },
    {
      email: 'amit.verma@example.com',
      event_id: 'evt_ind_pak_2026',
      event_name: 'IND vs PAK T20 — Demo Event',
      section: 'Sec 204',
      row: 'Row A',
      seat_number: 'Seat 01'
    }
  ];

  const createdTickets = [];

  for (const t of demoTickets) {
    const ticket = issueTicket(t);
    createdTickets.push(ticket);
    console.log(`   ✅ Seeded: ${ticket.buyer_email} -> Ticket ID: ${ticket.ticket_id} (Sec ${ticket.section} Row ${ticket.row} Seat ${ticket.seat_number})`);
  }

  const chainStatus = verifyHashChain();
  console.log(`\n[Hash Chain Audit]: ${chainStatus.reason}`);

  console.log(`\n================================================================`);
  console.log(`🌱 Seeding Complete. ${createdTickets.length} tickets created with full hash audit trail.`);
  console.log(`================================================================\n`);

  return createdTickets;
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
