export const formatDuration = (duration) => {
    if ('Flexible' in duration) {
      return 'Flexible (withdraw anytime)';
    }
    if ('Minutes' in duration) {
      const _minutes = duration.Minutes;
      const minutes = Number(_minutes);
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
    return 'Unknown duration'; 
}

export default {
    formatDuration
}