export interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-end';
  fromUserId: string;
  toUserId: string;
  data?: any;
}

const CALL_TIMEOUT = 60000; // 60 seconds timeout for ringing
const ICE_TIMEOUT = 10000; // 10 seconds to gather ICE candidates

export class CallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private callTimeout: NodeJS.Timeout | null = null;
  private connectionStateTimeout: NodeJS.Timeout | null = null;

  constructor(
    private onRemoteStream: (stream: MediaStream) => void,
    private onSignal: (signal: CallSignal) => void,
    private onCallEnd: () => void,
    private onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  ) {}

  async initializeCall(
    isVideo: boolean,
    recipientId: string,
    currentUserId: string
  ): Promise<{ offer: RTCSessionDescriptionInit; userId: string }> {
    await this.setupLocalStream(isVideo);

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
      ],
    });

    this.setupPeerConnection(recipientId, currentUserId);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Set timeout for call to complete
    this.setCallTimeout(recipientId, currentUserId);

    return {
      offer,
      userId: currentUserId,
    };
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      // Clear timeout once answer is received
      this.clearCallTimeout();
    }
  }

  async handleOffer(
    offer: RTCSessionDescriptionInit,
    isVideo: boolean,
    recipientId: string,
    currentUserId: string
  ): Promise<RTCSessionDescriptionInit> {
    await this.setupLocalStream(isVideo);

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
      ],
    });

    this.setupPeerConnection(recipientId, currentUserId);

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Set timeout for call to complete
    this.setCallTimeout(recipientId, currentUserId);

    return answer;
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.peerConnection && candidate) {
      try {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }

  private setupPeerConnection(recipientId: string, currentUserId: string) {
    if (!this.peerConnection) return;

    if (this.localStream) {
      console.log('Adding local tracks:', {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
      });
      
      this.localStream.getTracks().forEach((track) => {
        console.log('Adding track:', track.kind);
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal({
          type: 'ice-candidate',
          fromUserId: currentUserId,
          toUserId: recipientId,
          data: event.candidate.toJSON(),
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Remote track received:', {
        kind: event.track.kind,
        enabled: event.track.enabled,
        streams: event.streams.length,
      });
      
      // Ensure we get the first stream
      if (event.streams && event.streams.length > 0) {
        this.remoteStream = event.streams[0];
      } else if (event.track) {
        // Fallback: create stream from track if no streams provided
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
      }
      
      console.log('Remote stream ready:', {
        audioTracks: this.remoteStream?.getAudioTracks().length,
        videoTracks: this.remoteStream?.getVideoTracks().length,
      });
      
      this.onRemoteStream(this.remoteStream!);
      this.clearCallTimeout();
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state changed:', state);
      
      this.onConnectionStateChange?.(state as RTCPeerConnectionState);

      if (
        state === 'failed' ||
        state === 'disconnected' ||
        state === 'closed'
      ) {
        this.endCall();
      }

      if (state === 'connected') {
        this.clearCallTimeout();
      }
    };

    this.dataChannel = this.peerConnection.createDataChannel('chat');
    this.setupDataChannel();

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      this.clearCallTimeout();
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  private async setupLocalStream(isVideo: boolean) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Unable to access camera/microphone');
    }
  }

  private setCallTimeout(recipientId: string, currentUserId: string) {
    // Clear any existing timeout
    this.clearCallTimeout();

    // Set timeout - if call doesn't connect in 60 seconds, end it
    this.callTimeout = setTimeout(() => {
      console.log('Call timeout - no connection established');
      this.onSignal({
        type: 'call-end',
        fromUserId: currentUserId,
        toUserId: recipientId,
        data: { reason: 'timeout' },
      });
      this.endCall();
    }, CALL_TIMEOUT);
  }

  private clearCallTimeout() {
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }
    if (this.connectionStateTimeout) {
      clearTimeout(this.connectionStateTimeout);
      this.connectionStateTimeout = null;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  endCall() {
    this.clearCallTimeout();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    this.onCallEnd();
  }
}
