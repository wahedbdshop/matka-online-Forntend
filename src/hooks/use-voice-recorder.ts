import { useRef, useState, useCallback, useEffect } from "react";

export type MicPermission = "prompt" | "granted" | "denied" | "unsupported";

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function getVoiceRecordingFilename(blob: Blob) {
  if (blob.type.includes("mp4") || blob.type.includes("aac")) return "voice.m4a";
  if (blob.type.includes("ogg")) return "voice.ogg";
  return "voice.webm";
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermission>("prompt");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef("");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined" ||
      !getSupportedAudioMimeType()
    ) {
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
      if (
        typeof window === "undefined" ||
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        setMicPermission("unsupported");
        return false;
      }

      const mimeType = getSupportedAudioMimeType();
      if (!mimeType) {
        setMicPermission("unsupported");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      streamRef.current = stream;
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(250);
      setIsRecording(true);
      return true;
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
      mimeTypeRef.current = "";
      setIsRecording(false);
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
        const blob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current || "audio/webm",
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        mimeTypeRef.current = "";
        setIsRecording(false);
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.requestData();
      recorder.stop();
    });
  }, []);

  return { isRecording, micPermission, startRecording, stopRecording };
}
