import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video, VideoOff } from "lucide-react";
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
}: CallModalProps) {
  const { t } = useLanguage();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
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
          <p className="text-lg font-semibold">{recipientName}</p>
          <p className="text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Connecting..."}
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
                  className="w-full h-64 object-cover"
                />
              </div>
            )}
            {localStream && (
              <div className="bg-muted rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
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
