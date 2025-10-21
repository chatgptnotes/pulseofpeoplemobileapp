import * as Battery from 'expo-battery';
import * as Brightness from 'expo-brightness';

/**
 * Get the current battery level of the device
 * @returns Battery level as a percentage (0-1) or error message
 */
export const getBatteryLevel = async (): Promise<string | number> => {
  try {
    const batteryLevel = await Battery.getBatteryLevelAsync();
    console.log('🔋 Battery level requested:', batteryLevel);

    if (batteryLevel === -1) {
      return 'Error: Device does not support retrieving the battery level.';
    }

    // Convert to percentage and return user-friendly message
    const percentage = Math.round(batteryLevel * 100);
    return `Battery level is ${percentage}%`;
  } catch (error) {
    console.error('Error getting battery level:', error);
    return 'Error: Unable to retrieve battery level.';
  }
};

/**
 * Change the system brightness
 * @param brightness - Brightness level between 0 and 1
 * @returns Confirmation message
 */
export const changeBrightness = async (parameters: any): Promise<string> => {
  const { brightness } = parameters as { brightness: number };
  try {
    // Ensure brightness is within valid range
    const clampedBrightness = Math.max(0, Math.min(1, brightness / 100));

    console.log('💡 Changing brightness to:', clampedBrightness);
    await Brightness.setSystemBrightnessAsync(clampedBrightness);

    const percentage = Math.round(clampedBrightness * 100);
    return `Screen brightness changed to ${percentage}%`;
  } catch (error) {
    console.error('Error changing brightness:', error);
    return 'Error: Unable to change screen brightness.';
  }
};

/**
 * Flash the screen by briefly changing brightness
 * @returns Confirmation message
 */
export const flashScreen = async (): Promise<string> => {
  try {
    console.log('⚡ Flashing screen');

    // Get current brightness to restore later
    const currentBrightness = await Brightness.getSystemBrightnessAsync();

    // Flash to maximum brightness
    await Brightness.setSystemBrightnessAsync(1);

    // Wait 200ms then restore original brightness
    setTimeout(async () => {
      try {
        await Brightness.setSystemBrightnessAsync(currentBrightness);
      } catch (error) {
        console.error('Error restoring brightness:', error);
      }
    }, 200);

    return 'Screen flashed successfully!';
  } catch (error) {
    console.error('Error flashing screen:', error);
    return 'Error: Unable to flash screen.';
  }
};


/**
 * Get device information for the AI agent
 * @returns Device information string
 */
export const getDeviceInfo = async (): Promise<string> => {
  try {
    const batteryLevel = await Battery.getBatteryLevelAsync();
    const brightness = await Brightness.getSystemBrightnessAsync();

    const batteryPercentage = batteryLevel !== -1 ? Math.round(batteryLevel * 100) : 'Unknown';
    const brightnessPercentage = Math.round(brightness * 100);

    return `Device Status - Battery: ${batteryPercentage}%, Brightness: ${brightnessPercentage}%`;
  } catch (error) {
    console.error('Error getting device info:', error);
    return 'Error: Unable to retrieve device information.';
  }
};