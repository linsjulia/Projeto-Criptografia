import {
  vectorizeWord,
  padOrTrimChars,
  caesarEncrypt, rotNEncrypt, atbashEncrypt, vigenereEncrypt, columnarEncrypt,
  alphabet
} from './crypto-utils.js';

await tf.setBackend('cpu');
await tf.ready();

let classifierModel = null;
const regressorModels = {};

export function availableCiphers(){ return ['caesar','rot','atbash','vigenere','columnar']; }

function randomWord(min=3,max=10){
  const len = Math.min(Math.floor(Math.random()*(max-min+1))+min,max);
  let s='';
  for(let i=0;i<len;i++) s+=alphabet[Math.floor(Math.random()*26)];
  return s;
}

export function generateMultiCipherDataset({n=500,maxLen=12,maxVigKeyLen=4,maxCols=6}){
  const xs=[], yClass=[], yParams=[];
  const cipherTypes=availableCiphers();

  for(let i=0;i<n;i++){
    const type=cipherTypes[Math.floor(Math.random()*cipherTypes.length)];
    const plain=randomWord(3,maxLen);
    let cipher='', params=null;

    if(type==='caesar'){
      const shift=Math.floor(Math.random()*26);
      cipher=caesarEncrypt(plain,shift);
      params=[shift/25,0,0,0,0,0];
    } else if(type==='rot'){
      const nrot=Math.floor(Math.random()*26);
      cipher=rotNEncrypt(plain,nrot);
      params=[nrot/25,0,0,0,0,0];
    } else if(type==='atbash'){
      cipher=atbashEncrypt(plain);
      params=[0,0,0,0,0,0];
    } else if(type==='vigenere'){
      const keyLen=Math.min(Math.floor(Math.random()*maxVigKeyLen)+1,maxLen);
      const key=randomWord(keyLen,keyLen);
      cipher=vigenereEncrypt(plain,key);
      const shifts=Array.from(key).map(ch=>alphabet.indexOf(ch)/25);
      while(shifts.length<maxVigKeyLen) shifts.push(0);
      params=[0,...shifts.slice(0,4)];
    } else if(type==='columnar'){
      const cols=Math.min(Math.floor(Math.random()*(maxCols-1))+2,maxLen);
      cipher=columnarEncrypt(plain,cols);
      params=[cols/maxCols,0,0,0,0,0];
    }

    const vec=vectorizeWord(padOrTrimChars(cipher,maxLen),maxLen);
    if(vec.length!==maxLen) throw new Error(`Vector length mismatch: ${vec.length} != ${maxLen}`);
    xs.push(vec);

    const cls=cipherTypes.map(c=>c===type?1:0);
    yClass.push(cls);

    while(params.length<6) params.push(0);
    yParams.push(params.slice(0,6));
  }

  return {
    xs: tf.tensor2d(xs,[xs.length,maxLen]),
    yClass: tf.tensor2d(yClass,[yClass.length,yClass[0].length]),
    yParams: tf.tensor2d(yParams,[yParams.length,yParams[0].length])
  };
}

export function buildClassifier(inputDim,nClasses){
  const m=tf.sequential();
  m.add(tf.layers.dense({units:64,inputShape:[inputDim],activation:'relu'}));
  m.add(tf.layers.dense({units:32,activation:'relu'}));
  m.add(tf.layers.dense({units:nClasses,activation:'softmax'}));
  m.compile({optimizer:tf.train.adam(0.001),loss:'categoricalCrossentropy',metrics:['accuracy']});
  return m;
}

export function buildParamRegressor(inputDim,outDim){
  const m=tf.sequential();
  m.add(tf.layers.dense({units:64,inputShape:[inputDim],activation:'relu'}));
  m.add(tf.layers.dense({units:32,activation:'relu'}));
  m.add(tf.layers.dense({units:outDim,activation:'sigmoid'}));
  m.compile({optimizer:tf.train.adam(0.001),loss:'meanSquaredError',metrics:['mse']});
  return m;
}

export async function trainMultiModel(dataset,{epochs=12,onEpoch}={}){
  const inputDim=dataset.xs.shape[1];
  const nClasses=dataset.yClass.shape[1];

  if(!classifierModel) classifierModel=buildClassifier(inputDim,nClasses);
  if(!regressorModels['params']) regressorModels['params']=buildParamRegressor(inputDim,dataset.yParams.shape[1]);

  await classifierModel.fit(dataset.xs,dataset.yClass,{
    epochs,batchSize:128,shuffle:true,
    callbacks:{onEpochEnd: async(ep,logs)=>onEpoch?.('class',ep+1,logs)}
  });

  await regressorModels['params'].fit(dataset.xs,dataset.yParams,{
    epochs,batchSize:128,shuffle:true,
    callbacks:{onEpochEnd: async(ep,logs)=>onEpoch?.('params',ep+1,logs)}
  });

  return {classifierModel,paramsModel:regressorModels['params']};
}

export async function predictCipherAndParams(cipherText,maxLen=12){
  if(!classifierModel || !regressorModels['params']) throw new Error('Modelos não treinados');

  const cipher=padOrTrimChars(cipherText,maxLen);
  const v=vectorizeWord(cipher,maxLen);
  const t=tf.tensor2d([v]);

  const classProb=classifierModel.predict(t);
  const paramsOut=regressorModels['params'].predict(t);

  const classArr=Array.from(await classProb.data());
  const paramsArr=Array.from(await paramsOut.data());

  t.dispose(); classProb.dispose(); paramsOut.dispose();

  const cipherTypes=availableCiphers();
  const bestIdx=classArr.indexOf(Math.max(...classArr));

  return {
    probs: cipherTypes.map((c,i)=>({cipher:c,prob:classArr[i]})),
    best: cipherTypes[bestIdx],
    params: paramsArr
  };
}
