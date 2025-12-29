const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclus I, O, 0, 1 pour éviter confusion

export function generateInviteCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}
