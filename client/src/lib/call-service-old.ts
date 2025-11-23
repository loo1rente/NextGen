export interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-end';
  fromUserId: string;
  toUserId: string;
  data?: any;
}

export class CallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;

  constructor(
    private onRemoteStream: (stream: MediaStream) => void,
    private onSignal: (signal: CallSignal) => void,
    private onCallEnd: () => void
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
      this.localStream.getTracks().forEach((track) => {
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
      this.remoteStream = event.streams[0];
      this.onRemoteStream(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (
        this.peerConnection?.connectionState === 'failed' ||
        this.peerConnection?.connectionState === 'disconnected' ||
        this.peerConnection?.connectionState === 'closed'
      ) {
        this.endCall();
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

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
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
