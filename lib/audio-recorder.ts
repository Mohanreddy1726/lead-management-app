"use client";

export interface RecordingResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
  durationFormatted: string;
  transcript: string;
}

export class CallAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private speechRecognizer: any = null;
  private liveTranscript: string = "";
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isRecording: boolean = false;

  async start(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("MediaDevices API not supported on this device/browser");
        return false;
      }

      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioChunks = [];
      this.liveTranscript = "";
      this.startTime = Date.now();

      // Configure MediaRecorder
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options.mimeType = "audio/mp4";
      }

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Set up Audio Analyser for live visualizer wave
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          const source = this.audioContext.createMediaStreamSource(this.audioStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          source.connect(this.analyser);
        }
      } catch (e) {
        // AudioContext optional
      }

      // Set up native SpeechRecognition if supported
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          this.speechRecognizer = new SpeechRec();
          this.speechRecognizer.continuous = true;
          this.speechRecognizer.interimResults = true;
          this.speechRecognizer.lang = "en-IN";

          this.speechRecognizer.onresult = (event: any) => {
            let fullText = "";
            for (let i = 0; i < event.results.length; i++) {
              fullText += event.results[i][0].transcript + " ";
            }
            this.liveTranscript = fullText.trim();
          };

          this.speechRecognizer.onerror = () => {};
          this.speechRecognizer.start();
        }
      } catch (e) {
        // SpeechRecognition optional
      }

      this.mediaRecorder.start(1000); // chunk every 1 second
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error("[CallAudioRecorder] Failed to start microphone recording:", err);
      return false;
    }
  }

  getAudioLevel(): number {
    if (!this.analyser || !this.isRecording) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(100, Math.round((avg / 128) * 100));
  }

  async stop(): Promise<RecordingResult | null> {
    if (!this.mediaRecorder || !this.isRecording) return null;

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
        const mins = Math.floor(durationSeconds / 60);
        const secs = durationSeconds % 60;
        const durationFormatted = `${mins}m ${secs}s`;

        this.cleanup();

        resolve({
          blob,
          url,
          durationSeconds,
          durationFormatted,
          transcript: this.liveTranscript,
        });
      };

      try {
        if (this.speechRecognizer) {
          this.speechRecognizer.stop();
        }
      } catch (e) {}

      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
      this.isRecording = false;
    });
  }

  private cleanup() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.speechRecognizer = null;
    this.isRecording = false;
  }
}

export async function uploadCallRecording(
  blob: Blob,
  leadId: string,
  duration: string
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("audio", blob, `call_${leadId}_${Date.now()}.webm`);
    formData.append("leadId", leadId);
    formData.append("duration", duration);

    const res = await fetch("/api/calls/recordings/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.recordingUrl || null;
  } catch (err) {
    console.error("[Audio Upload] Error:", err);
    return null;
  }
}

export async function uploadNativeCallRecordingFile(
  file: File,
  leadId: string,
  duration: string = "2m 00s"
): Promise<{ recordingUrl: string; duration: string; filename: string } | null> {
  try {
    const formData = new FormData();
    formData.append("audio", file, file.name);
    formData.append("leadId", leadId);
    formData.append("duration", duration);

    const res = await fetch("/api/calls/recordings/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      recordingUrl: data.recordingUrl,
      duration: data.duration || duration,
      filename: data.filename || file.name,
    };
  } catch (err) {
    console.error("[Native Audio Upload] Error:", err);
    return null;
  }
}

export async function fetchCallAiSummary(payload: {
  leadId: string;
  leadName: string;
  course: string;
  country: string;
  transcript?: string;
  duration: string;
  recordingUrl?: string;
  audioBase64?: string;
  audioMimeType?: string;
}) {
  try {
    const res = await fetch("/api/calls/ai-summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.summary || null;
  } catch (err) {
    console.error("[AI Summarize Client] Error:", err);
    return null;
  }
}
