const Task = require('../models/Task');

/**
 * Check for upcoming tasks and send notifications
 * Called by cron job every minute
 */
exports.checkUpcomingTasks = async () => {
  try {
    const now = new Date();
    const advanceMinutes = parseInt(process.env.NOTIFICATION_ADVANCE_MINUTES) || 15;
    const checkUntil = new Date(now.getTime() + advanceMinutes * 60000);

    // Find tasks with reminders that haven't been sent yet
    const tasksToNotify = await Task.find({
      reminderDate: {
        $gte: now,
        $lte: checkUntil
      },
      reminderSent: false,
      status: { $ne: 'Hoàn thành' }
    }).populate('user project category');

    console.log(`🔔 Checking notifications: Found ${tasksToNotify.length} tasks`);

    for (const task of tasksToNotify) {
      // Send notification (implement with your notification service)
      // Example: FCM, OneSignal, or custom websocket
      await sendNotification(task);
      
      // Mark as sent
      task.reminderSent = true;
      await task.save();
    }
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
};

/**
 * Send notification to user
 * Implement this with your preferred notification service
 */
async function sendNotification(task) {
  // TODO: Implement with FCM, OneSignal, etc.
  console.log(`📬 Notification would be sent for task: ${task.title}`);
  
  // Example notification payload:
  const notification = {
    userId: task.user._id,
    title: 'Nhắc nhở công việc',
    body: `"${task.title}" sắp đến hạn`,
    data: {
      taskId: task._id,
      type: 'task_reminder',
      priority: task.priority
    }
  };

  // Your notification sending logic here
  // await fcm.send(notification);
  
  return notification;
}

module.exports.sendNotification = sendNotification;