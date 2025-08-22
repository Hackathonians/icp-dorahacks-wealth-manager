export const formatDuration = (duration) => {
    let minutes;
    
    // Handle both object format {Minutes: 60} and direct number format
    if (typeof duration === 'number') {
      minutes = duration;
    } else if (duration && duration.Minutes) {
      minutes = Number(duration.Minutes);
    } else {
      return 'Unknown duration';
    }
    
    if (minutes === -1) {
      return 'Flexible (withdraw anytime)';
    }
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes < 43200) {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else {
      const months = Math.floor(minutes / 43200);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
}

export default {
    formatDuration
}