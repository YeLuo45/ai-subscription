// Hardware capability detection for local inference

import type { HardwareCapability } from './types';

export async function detectHardware(): Promise<HardwareCapability> {
  const capability: HardwareCapability = {
    hasGPU: false,
    hasWASM: false,
    memoryGB: 0,
    supportsQuantization: false,
    webGPUAvailable: false,
  };

  // Check WebAssembly support
  capability.hasWASM = typeof WebAssembly === 'object' && 
    typeof WebAssembly.instantiate === 'function';

  // Check WebGPU support
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    capability.webGPUAvailable = !!adapter;
    capability.hasGPU = !!adapter;
  } catch {
    capability.webGPUAvailable = false;
    capability.hasGPU = false;
  }

  // Estimate memory (DeviceMemory API if available)
  if ('deviceMemory' in navigator) {
    capability.memoryGB = (navigator as any).deviceMemory || 4;
  } else {
    // Fallback estimate
    capability.memoryGB = 4;
  }

  // Quantization support requires WASM + SIMD (optional)
  capability.supportsQuantization = capability.hasWASM;

  return capability;
}

export function getRecommendedQuantization(hardware: HardwareCapability): 'int4' | 'int8' | 'fp16' {
  if (!hardware.hasGPU && hardware.memoryGB <= 4) {
    return 'int4';
  }
  if (!hardware.hasGPU && hardware.memoryGB <= 8) {
    return 'int8';
  }
  return 'fp16';
}

export function canRunLocalModel(hardware: HardwareCapability): boolean {
  // Minimum requirements: WASM support + at least 2GB memory
  return hardware.hasWASM && hardware.memoryGB >= 2;
}
