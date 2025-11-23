// Notification service with sound support
export class NotificationService {
  private static audioContext: AudioContext | null = null;

  static async playNotificationSound(type: 'call' | 'message' = 'message') {
    try {
      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Create oscillator for sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'call') {
        // Call ringing sound: alternating tones
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1000, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.setValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Message notification: quick beep
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.setValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  static async sendNotification(
    title: string,
    options?: NotificationOptions & { sound?: 'call' | 'message' }
  ) {
    try {
      // Request permission if not already granted
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        // Create and show notification
        const notification = new Notification(title, {
          ...options,
          badge: '/favicon.png',
          icon: '/favicon.png',
        });

        // Play sound if specified
        if (options?.sound) {
          await this.playNotificationSound(options.sound);
        }

        // Auto-close after 5 seconds if not a call
        if (options?.sound !== 'call') {
          setTimeout(() => notification.close(), 5000);
        }

        return notification;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  static async sendCallNotification(
    callerName: string,
    isVideo: boolean,
    onAnswer?: () => void,
    onDecline?: () => void
  ) {
    const title = `${callerName} is calling${isVideo ? ' (video)' : ''}...`;
    
    const notification = await this.sendNotification(title, {
      sound: 'call',
      body: `${isVideo ? 'Video' : 'Voice'} call from ${callerName}`,
      tag: 'incoming-call',
      requireInteraction: true,
    });

    if (notification) {
      notification.onclick = () => {
        window.focus();
        onAnswer?.();
        notification.close();
      };

      // Handle decline via notification actions (requires service worker)
      if ('actions' in notification) {
        notification.onclose = () => {
          onDecline?.();
        };
      }
    }

    // Also play repeated ringing sound
    this.playRepeatingCallSound();
  }

  static async sendMessageNotification(
    senderName: string,
    message: string
  ) {
    const truncatedMsg = message.length > 50 ? message.substring(0, 50) + '...' : message;
    
    return this.sendNotification(`Message from ${senderName}`, {
      sound: 'message',
      body: truncatedMsg,
      tag: 'incoming-message',
    });
  }

  private static async playRepeatingCallSound(duration: number = 30000) {
    const startTime = Date.now();
    const playSound = async () => {
      if (Date.now() - startTime < duration) {
        await this.playNotificationSound('call');
        setTimeout(playSound, 1500); // Repeat every 1.5 seconds
      }
    };
    playSound();
  }
}
