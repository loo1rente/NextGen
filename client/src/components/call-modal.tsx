import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video, VideoOff, Circle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { AvatarDisplay } from "@/components/avatar-display";

interface CallModalProps {
  recipientName: string;
  recipientAvatarUrl?: string;
  isIncoming: boolean;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  isConnected: boolean;
  callDuration?: number;
}

export function CallModal({
  recipientName,
  recipientAvatarUrl,
  isIncoming,
  isVideo,
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onEnd,
  isConnected,
  callDuration = 0,
}: CallModalProps) {
  const { t } = useLanguage();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [displayDuration, setDisplayDuration] = useState(0);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      setDisplayDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('Setting remote stream with tracks:', {
        audioTracks: remoteStream.getAudioTracks().length,
        videoTracks: remoteStream.getVideoTracks().length,
      });
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (isIncoming && !isConnected) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg p-8 w-96 text-center">
          <div className="flex justify-center mb-4">
            <AvatarDisplay
              username={recipientName}
              avatarUrl={recipientAvatarUrl}
              size="lg"
            />
          </div>
          <p className="text-lg font-semibold mb-2">{recipientName}</p>
          <p className="text-sm text-muted-foreground mb-6">
            {isVideo ? "Incoming video call..." : "Incoming voice call..."}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={onAccept}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Phone className="h-5 w-5 mr-2" />
              Accept
            </Button>
            <Button
              onClick={onDecline}
              variant="destructive"
              size="lg"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Decline
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-96">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-lg font-semibold">{recipientName}</p>
            {!isConnected && (
              <Circle className="h-3 w-3 animate-pulse bg-red-500 rounded-full" />
            )}
            {isConnected && (
              <Circle className="h-3 w-3 bg-green-500 rounded-full" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isConnected ? formatDuration(displayDuration) : "Connecting..."}
          </p>
        </div>

        {isVideo && (
          <div className="space-y-4 mb-6">
            {remoteStream && (
              <div className="bg-black rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  controls={false}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}
            {!remoteStream && isConnected && (
              <div className="bg-black rounded-lg overflow-hidden h-64 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Waiting for video...</p>
              </div>
            )}
            {localStream && (
              <div className="bg-muted rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  controls={false}
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
          </div>
        )}

        {!isVideo && !remoteStream && (
          <div className="flex justify-center mb-6">
            <div className="h-32 w-32 bg-muted rounded-full flex items-center justify-center">
              <AvatarDisplay
                username={recipientName}
                avatarUrl={recipientAvatarUrl}
                size="lg"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button
            onClick={onEnd}
            variant="destructive"
            size="lg"
            className="w-14 h-14 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
