import { getData } from './DataTransformer.js';

import * as d3 from "d3";


onmessage = e => {
  const t0 = performance.now();
  const suggestion = getSuggestedFeature(e.data);
  const t1 = performance.now();
  const [d, features, rows] = e.data.dataset.name.split('.')[0].split('-');
  // console.log(`${features},${rows},${e.data.selected.length},${e.data.criterion},${(t1 - t0).toFixed(2)}`);
  postMessage(suggestion);
}

function getSuggestedFeature({criterion, selected, metadata, dataset}) {
  if (criterion === 'none') {
    return '';
  }

  const available = metadata.featureNames.filter(d => !selected.includes(d));

  if (criterion === 'entropy') {
    return entropy({selected, metadata, dataset, available});
  } else if (criterion === 'errorCount') {
    return errorCount({selected, metadata, dataset, available});
  } else if (criterion === 'errorPercent') {
    return errorPercent({selected, metadata, dataset, available});
  } else if (criterion === 'errorDeviation') {
    return errorDeviation({selected, metadata, dataset, available})
  } else {
    return '';
  }
}

/*
  Return the feature that results in the nodes with the
  lowest average entropy.
*/
function entropy({selected, metadata, dataset, available}) {
  let suggestion = '';
  let minEntropy = Number.POSITIVE_INFINITY;

  available.forEach(feature => {
    const sel = [...selected, feature];
    const data = getData(metadata, sel, dataset);
    const ent = d3.sum(data, square => {
      const weight = square.size / metadata.size;
      return weight * H(square);
    });

    if (ent < minEntropy) {
      suggestion = feature;
      minEntropy = ent;
    }
  });

  return suggestion;

  function H(square) {
    return -d3.sum(square.groundTruth.values(), v => {
      const p = v / square.size;
      return p * Math.log2(p);
    });
  }
}

function errorDeviation({selected, metadata, dataset, available}) {
  let suggestion = '';
  let maxDeviation = 0;

  available.forEach(feature => {
    const sel = [...selected, feature];
    const data = getData(metadata, sel, dataset);

    const dev = d3.deviation(data, d => getErrorCountForSquare(d) / d.size);

    if (dev > maxDeviation) {
      suggestion = feature;
      maxDeviation = dev;
    }
  });

  return suggestion;
}

/*
  Return the feature that results in the single node that has
  the highest number of errors.
*/
function errorCount({selected, metadata, dataset, available}) {
  let suggestion = '';
  let maxError = 0;

  available.forEach(feature => {
    const sel = [...selected, feature];
    const data = getData(metadata, sel, dataset);

    const errors = d3.max(data, getErrorCountForSquare);

    if (errors > maxError) {
      suggestion = feature;
      maxError = errors;
    }
  });

  return suggestion;
}

/*
  Return the feature that results in the single node that has
  the highest percent of errors.
*/
function errorPercent({selected, metadata, dataset, available}) {
  let suggestion = '';
  let maxError = 0;

  available.forEach(feature => {
    const sel = [...selected, feature];
    const data = getData(metadata, sel, dataset);

    const errors = d3.max(data, d => getErrorCountForSquare(d) / d.size);

    if (errors > maxError) {
      suggestion = feature;
      maxError = errors;
    }
  });

  return suggestion;
}

function getErrorCountForSquare(square) {
  // one Map per class
  const predictionResultsPerClass = Array.from(square.predictionResults.values());
  // get sum of incorrect predictions for each class
  const errorCount = d3.sum(predictionResultsPerClass,
    p => p.has('incorrect') ?
      p.get('incorrect') :
      0
  );

  return errorCount;
}