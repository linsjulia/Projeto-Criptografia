const alphabet = 'abcdefghijklmnopqrstuvwxyz';

export function onlyLetters(s){ return (s||'').toLowerCase().replace(/[^a-z]/g,''); }

export function caesarEncrypt(plain, shift){
  plain = onlyLetters(plain);
  return Array.from(plain).map(ch => alphabet[(alphabet.indexOf(ch)+shift)%26]).join('');
}
export function caesarDecrypt(cipher, shift){
  cipher = onlyLetters(cipher);
  return Array.from(cipher).map(ch => alphabet[(alphabet.indexOf(ch)-shift+26)%26]).join('');
}
export function rotNEncrypt(plain, n){ return caesarEncrypt(plain, n); }
export function rotNDecrypt(cipher, n){ return caesarDecrypt(cipher, n); }

export function atbashEncrypt(plain){
  plain = onlyLetters(plain);
  return Array.from(plain).map(ch => alphabet[25 - alphabet.indexOf(ch)]).join('');
}
export const atbashDecrypt = atbashEncrypt;

export function vigenereEncrypt(plain, key){
  plain = onlyLetters(plain);
  key = onlyLetters(key);
  if(key.length===0) return plain;
  return Array.from(plain).map((ch,i)=> {
    const s = (alphabet.indexOf(ch) + alphabet.indexOf(key[i % key.length])) % 26;
    return alphabet[s];
  }).join('');
}
export function vigenereDecrypt(cipher, key){
  cipher = onlyLetters(cipher);
  key = onlyLetters(key);
  if(key.length===0) return cipher;
  return Array.from(cipher).map((ch,i)=> {
    const s = (alphabet.indexOf(ch) - alphabet.indexOf(key[i % key.length]) + 26) % 26;
    return alphabet[s];
  }).join('');
}

export function columnarEncrypt(plain, cols){
  plain = onlyLetters(plain);
  cols = Math.max(2, Math.floor(cols));
  const rows = Math.ceil(plain.length / cols);
  let grid = Array.from({length:rows}, ()=>Array(cols).fill(''));
  let k=0;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(k < plain.length) grid[r][c] = plain[k++];
    }
  }
  let out='';
  for(let c=0;c<cols;c++) for(let r=0;r<rows;r++) if(grid[r][c]) out+=grid[r][c];
  return out;
}
export function columnarDecrypt(cipher, cols){
  cipher = onlyLetters(cipher);
  cols = Math.max(2, Math.floor(cols));
  const rows = Math.ceil(cipher.length / cols);
  const shortCols = cols*rows - cipher.length;
  let grid = Array.from({length:rows}, ()=>Array(cols).fill(''));
  let idx=0;
  for(let c=0;c<cols;c++){
    const thisColRows = rows - (c >= cols - shortCols ? 1 : 0);
    for(let r=0;r<thisColRows;r++) grid[r][c] = cipher[idx++]||'';
  }
  let out='';
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) out+=grid[r][c]||'';
  return out;
}

export function padOrTrimChars(s, maxLen){
  s = onlyLetters(s);
  if(s.length>maxLen) s=s.slice(0,maxLen);
  while(s.length<maxLen) s+='{';
  return s;
}
export function vectorizeWord(s, maxLen){
  s = padOrTrimChars(s,maxLen);
  const vec=[];
  for(let i=0;i<maxLen;i++){
    const ch=s[i];
    if(ch==='{') vec.push(-1);
    else vec.push((alphabet.indexOf(ch)/25)*2 - 1);
  }
  return vec;
}

export { alphabet };
