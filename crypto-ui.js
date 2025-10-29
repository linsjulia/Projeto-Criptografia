import { generateMultiCipherDataset, trainMultiModel, predictCipherAndParams } from './crypto-model.js';
import { caesarDecrypt, vigenereDecrypt, columnarDecrypt, atbashDecrypt, rotNDecrypt } from './crypto-utils.js';

const inputKW = document.getElementById('kw');
const outDiv = document.getElementById('out');
const btnTreinar = document.getElementById('btnTreinar');
const btnPrever = document.getElementById('btnPrever');
const btnLimpar = document.getElementById('btnLimpar');

let currentDataset = null;

function showOut(html) {
    outDiv.innerHTML = html;
}

function onClearClicked() {
    inputKW.value = '';
    showOut('');
}

async function onTrainClicked() {
    const status = document.getElementById('trainStatus');
    const maxLen = 12;
    const nSamples = 500;

    if(status) status.textContent = 'Gerando dataset seguro...';

    if(currentDataset){
        currentDataset.xs.dispose();
        currentDataset.yClass.dispose();
        currentDataset.yParams.dispose();
    }

    try {
        currentDataset = generateMultiCipherDataset({ n: nSamples, maxLen, maxVigKeyLen: 4, maxCols: 6 });
    } catch(err){
        showOut(`Erro ao gerar dataset: ${err.message}`);
        return;
    }

    if(status) status.textContent = 'Treinando modelos (isso roda no browser)...';
    try {
        await trainMultiModel(currentDataset, {
            epochs: 12,
            onEpoch: (which, ep, logs) => {
                if(status) status.textContent = `Treinando ${which} — ep ${ep} loss ${(logs.loss||0).toFixed(4)}`;
            }
        });
    } catch(err){
        showOut(`Erro durante treino: ${err.message}`);
        return;
    }

    if(status) status.textContent = 'Treino concluído.';
    showOut('Treino concluído: a IA agora pode prever o tipo de cifra e parâmetros aproximados.');
}

async function onPredictClicked() {
    const txt = inputKW.value || '';
    const cleaned = txt.replace(/[^a-zA-Z]/g,'').toLowerCase();
    if(!cleaned){ showOut('Digite a palavra-chave (apenas letras).'); return; }

    const maxLen = 12;

    try {
        const pred = await predictCipherAndParams(cleaned, maxLen);

        let attempt = '', explanation = '';
        const best = pred.best;
        const params = pred.params;

        if(best === 'caesar'){
            const shift = Math.round(params[0]*25);
            attempt = caesarDecrypt(cleaned, shift);
            explanation = `Predito: Caesar (shift ≈ ${shift})`;
        } else if(best === 'rot'){
            const shift = Math.round(params[0]*25);
            attempt = rotNDecrypt(cleaned, shift);
            explanation = `Predito: ROT-N (N ≈ ${shift})`;
        } else if(best === 'atbash'){
            attempt = atbashDecrypt(cleaned);
            explanation = 'Predito: Atbash (decifração direta)';
        } else if(best === 'vigenere'){
            const possibleShifts = params.slice(1,5).map(x => Math.round(x*25));
            let key = possibleShifts.map(s => String.fromCharCode(97 + (s%26))).join('');
            attempt = vigenereDecrypt(cleaned, key);
            explanation = `Predito: Vigenère (chave tentativa: "${key}")`;
        } else if(best === 'columnar'){
            const cols = Math.max(2, Math.round(params[0]*6));
            attempt = columnarDecrypt(cleaned, cols);
            explanation = `Predito: Transposição coluna (cols ≈ ${cols})`;
        } else {
            attempt = 'Não foi possível decifrar com os modelos atuais.';
        }

        const probsHtml = pred.probs.map(p=> `${p.cipher}: ${(p.prob*100).toFixed(1)}%`).join(' · ');
        showOut(`<div style="font-family:monospace">Probs: ${probsHtml}<br><strong>${explanation}</strong><br>Decifra tentativa: <pre>${attempt}</pre></div>`);

    } catch(err){
        showOut('Erro: precisa treinar o modelo primeiro. Clique em "Treinar IA".');
    }
}

btnTreinar?.addEventListener('click', onTrainClicked);
btnPrever?.addEventListener('click', onPredictClicked);
btnLimpar?.addEventListener('click', onClearClicked);
