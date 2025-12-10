/**
 * Fisher-Yates shuffle algorithm for random pairing
 * Ensures each person gets exactly one assignment
 */
export function shuffleAssignments(participants) {
  const shuffled = [...participants];
  
  // Shuffle using Fisher-Yates algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Create assignments ensuring no one is assigned to themselves
 * Uses public_id for the assignment mapping (what givers see)
 * Each giver sees receiver's public_id, not their secret_id
 */
export function createAssignments(participants) {
  let shuffled = shuffleAssignments(participants);
  
  // Check for self-assignments and re-shuffle if needed
  let attempts = 0;
  while (hasSelfAssignments(participants, shuffled) && attempts < 100) {
    shuffled = shuffleAssignments(participants);
    attempts++;
  }

  if (attempts === 100) {
    throw new Error('Could not create valid assignments after 100 attempts');
  }

  // Create assignment pairs using public_id for both giver and receiver
  // This ensures givers see different IDs than what the participants know as their own
  return participants.map((p, index) => ({
    giver_id: p.public_id,
    receiver_id: shuffled[index].public_id
  }));
}

/**
 * Check if any participant is assigned to themselves
 * Compares public_ids to prevent self-assignments
 */
function hasSelfAssignments(participants, shuffled) {
  return participants.some((p, index) => {
    return p.public_id === shuffled[index].public_id;
  });
}
