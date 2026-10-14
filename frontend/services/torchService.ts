let torchTrack: MediaStreamTrack | null = null;
let torchStream: MediaStream | null = null;

export const toggleDeviceTorch = async (desiredState?: boolean): Promise<{ success: boolean; isTorchOn: boolean }> => {
  try {
    if (torchTrack) {
      // Already active, toggle or turn off
      const willTurnOff = desiredState !== undefined ? !desiredState : true;
      if (willTurnOff) {
        torchTrack.stop();
        if (torchStream) {
          torchStream.getTracks().forEach((t) => t.stop());
        }
        torchTrack = null;
        torchStream = null;
        return { success: true, isTorchOn: false };
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          advanced: [{ torch: true } as unknown as MediaTrackConstraintSet],
        },
      });

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities && (track.getCapabilities() as unknown as { torch?: boolean })) || {};

      if (capabilities.torch) {
        await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: true }],
        });
        torchTrack = track;
        torchStream = stream;
        return { success: true, isTorchOn: true };
      } else {
        track.stop();
        stream.getTracks().forEach((t) => t.stop());
      }
    }
  } catch (e) {
    console.debug('Native torch not available or camera permission declined:', e);
  }

  return { success: false, isTorchOn: false };
};
