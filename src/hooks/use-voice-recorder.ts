import { useRef, useState, useCallback, useEffect } from "react";

export type MicPermission = "prompt" | "granted" | "denied" | "unsupported";

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermission>("prompt");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      return;
    }
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        setMicPermission(result.state as MicPermission);
        result.onchange = () => setMicPermission(result.state as MicPermission);
      })
      .catch(() => {
        // Permissions API not supported — leave as "prompt"
      });
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      setIsRecording(true);
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setMicPermission("denied");
      }
      return false;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.stop();
    });
  }, []);

  return { isRecording, micPermission, startRecording, stopRecording };
}
