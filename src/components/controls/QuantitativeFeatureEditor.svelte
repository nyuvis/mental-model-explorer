<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { dataset } from "../../stores.js";
  import { equalIntervalThresholds, quantileThresholds, getBinLabels } from "../../DataTransformer.js";
  import Histogram from '../visualization/histogram/Histogram.svelte';

  import * as d3 from "d3";

  export let feature;

  export function onWindowClose() {
    if (feature.splitType === 'custom' ||
      originalFormatSpecifier !== feature.format) {
      setAxisValues();
    }
  }

  const originalFormatSpecifier = feature.format;
  let format = d3.format(feature.format);

  const dispatch = createEventDispatcher();

  const datasetValues = $dataset.map(d => d[feature.name]);
  const extent = d3.extent(datasetValues);

  const splits = [
    { value: 'interval', display: 'Equal Width' },
    { value: 'quantile', display: 'Quantiles' },
    { value: 'custom', display: 'Custom' },
  ];

  const bins = [2, 3, 4, 5];

  let validThresholds = true;
  let validFormat = true;
  $: valid = validThresholds && validFormat;
  $: dispatch('validate', valid);

  onMount(() => dispatch('validate', true));

  function onFormatInput() {
    try {
      format = d3.format(feature.format);
      validFormat = true;
    } catch (error) {
      validFormat = false;
    }
  }

  function onSelectChange() {
    if (feature.splitType === 'interval') {
      validThresholds = true;
      feature.thresholds = equalIntervalThresholds(extent, feature.numBins);
      setAxisValues();
    } else if (feature.splitType === 'quantile') {
      validThresholds = true;
      feature.thresholds = quantileThresholds(datasetValues, feature.numBins);
      setAxisValues();
    } else if (feature.splitType === 'custom') {
      const targetNumThresholds = feature.numBins - 1;
      const numThreshold = feature.thresholds.length;
      const diff = Math.abs(targetNumThresholds - numThreshold);

      if (targetNumThresholds < numThreshold) {
        feature.thresholds = feature.thresholds.slice(0, -diff);
      } else if (targetNumThresholds > numThreshold) {
        feature.thresholds = feature.thresholds.concat(Array(diff).fill(0));
      }

      validThresholds = areThresholdsValid();
    }
  }

  function areThresholdsValid() {
    // thresholds must be strictly increasing
    const arr = [extent[0], ...feature.thresholds, extent[1]];

    for (let i = 1, n = arr.length; i < n; i++) {
      if (arr[i - 1] >= arr[i]) {
        return false;
      }
    }

    return true;
  }

  function setAxisValues() {
    const bin = d3.bin()
      .domain(extent)
      .thresholds(feature.thresholds);
    const bins = bin(datasetValues);
    feature.values = getBinLabels(bins, format);
    feature.thresholds = bin.thresholds()();
  }
</script>

<div class="section">
  <p class="sub-label">Distribution</p>
  <p class="sub-label small info">The red ticks show the current bin thresholds.</p>
  <Histogram feature={feature.name} thresholds={feature.thresholds}/>
</div>

<div class="section">
  <p class="sub-label">Format</p>
  <p class="sub-label small info">
    This value can be any valid <a href="https://github.com/d3/d3-format#locale_format" target="_blank" rel="noopener noreferrer">d3-format specifier</a>.
  </p>
  <input
    type="text"
    bind:value={feature.format}
    placeholder="Ex: .2~f"
    size=8
    on:input={onFormatInput}
    on:change={() => {
      if (validFormat) {
        setAxisValues();
      }
    }}
  >
  {#if !validFormat}
    <span class="invalid small">Invalid format.</span>
  {/if}
</div>

<div class="section">
  <p class="sub-label">Number of bins</p>
  <!-- svelte-ignore a11y-no-onchange -->
  <select bind:value={feature.numBins} on:change={onSelectChange}>
    {#each bins as bin}
      <option {bin}>{bin}</option>
    {/each}
  </select>
</div>

<div class="section">
  <p class="sub-label">Split type</p>
  <!-- svelte-ignore a11y-no-onchange -->
  <select bind:value={feature.splitType} on:change={onSelectChange}>
    {#each splits as {value, display}}
      <option {value}>{display}</option>
    {/each}
  </select>
</div>

{#if feature.splitType === 'custom'}
  <div class="section">
    <p class="sub-label">Thresholds</p>
    <p class="sub-label small info">
      Values less than the first threshold are in the first bin. Values greater than or equal to threshold <i>i - 1</i> and less than threshold <i>i</i> are in bin <i>i</i>.
      <span class:invalid={!validThresholds}>Thresholds must be greater than the minimum value, less than the maximum value, and strictly increasing.</span>
    </p>
    <table class="small">
      <tbody>
        <tr>
          <td>Min value</td>
          <td class="align-right">{format(extent[0])}</td>
        </tr>
        {#each feature.thresholds as threshold, i}
          <tr>
            <td>Threshold {i + 1}</td>
            <td>
              <input
                class="align-right"
                type="number"
                step="any"
                bind:value={threshold}
                on:change={() => validThresholds = areThresholdsValid()}>
            </td>
          </tr>
        {/each}
        <tr>
          <td>Max value</td>
          <td class="align-right">{format(extent[1])}</td>
        </tr>
      </tbody>
    </table>
  </div>
{:else}
  <div class="section">
    <p class="sub-label">Bins</p>
    <p class="small">{feature.values.join(' ')}</p>
  </div>
{/if}

<style>
  .section {
    align-self: flex-start;
    margin: 0.5em 0;
    width: 100%;
  }

  .align-right {
    text-align: right;
  }

  .invalid {
    color: var(--red);
  }

  .info {
    max-width: 50em;
  }
</style>
