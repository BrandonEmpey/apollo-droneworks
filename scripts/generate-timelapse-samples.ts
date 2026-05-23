import { db } from '../server/db';
import { timelapseItems } from '../shared/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * This script generates sample timelapse items for testing
 * - Image series (JPG) for photo timelapse view
 * - Video series (MP4) for video timelapse view
 * - Orthomosaic models (OBJ) for 3D model timelapse view
 */

async function main() {
  try {
    console.log('Starting to generate timelapse sample items...');

    // Sample image URLs (unsplash construction/drone photos)
    const imageUrls = [
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5',
      'https://images.unsplash.com/photo-1508450859948-4e04fabaa4ea',
      'https://images.unsplash.com/photo-1586786168137-e9b18e5b6c3b',
      'https://images.unsplash.com/photo-1583965057951-f24bd5b77860',
      'https://images.unsplash.com/photo-1567521464027-f6b0e451e738',
      'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348',
      'https://images.unsplash.com/photo-1605910909354-ac5a7cba7be9',
    ];

    // Sample video URLs (sample video files from various sources)
    const videoUrls = [
      'https://assets.mixkit.co/videos/preview/mixkit-drone-aerial-view-of-a-landscape-of-a-mountain-range-9516-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-beach-with-turquoise-water-4950-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-house-under-construction-4649-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-on-a-bridge-4632-large.mp4',
      'https://download.samplelib.com/mp4/sample-5s.mp4',
      'https://download.samplelib.com/mp4/sample-10s.mp4'
    ];

    // Sample OBJ model URLs (generic 3D models)
    const objUrls = [
      'https://threejs.org/examples/models/obj/cerberus/Cerberus.obj',
      'https://threejs.org/examples/models/obj/male02/male02.obj',
      'https://threejs.org/examples/models/obj/female02/female02.obj',
      'https://threejs.org/examples/models/obj/tree.obj',
      'https://threejs.org/examples/models/obj/leeperrysmith/LeePerrySmith.obj'
    ];

    // Define target project and task IDs
    // We'll need to identify a valid project and task to add these to
    const targetProjectId = 14; // You may need to change this to a valid project ID
    
    // Get all tasks for the project
    const tasks = await db.query.projectTasks.findMany({
      where: (task, { eq }) => eq(task.projectId, targetProjectId)
    });

    if (tasks.length === 0) {
      console.error(`No tasks found for project ID ${targetProjectId}`);
      return;
    }

    // Find specific tasks for each type of timelapse
    // High-Definition Property Capture - for images
    // Construction Monitoring - for videos
    // 3D Modeling - for 3D model files
    let imageTask = tasks.find(task => task.title?.includes('High - Definition Property Capture')) || tasks[0];
    let videoTask = tasks.find(task => task.title?.includes('Construction Monitoring')) || tasks[0];
    let objTask = tasks.find(task => task.title?.includes('3D Modeling')) || tasks[0];
    
    // Fallback to specific task IDs if needed
    if (!imageTask) imageTask = tasks.find(task => task.id === 15) || tasks[0];
    if (!videoTask) videoTask = tasks.find(task => task.id === 12) || tasks[0];
    if (!objTask) objTask = tasks.find(task => task.id === 14) || tasks[0];

    console.log(`Adding image timelapses to task ID ${imageTask.id}`);
    console.log(`Adding video timelapses to task ID ${videoTask.id}`);
    console.log(`Adding 3D model timelapses to task ID ${objTask.id}`);

    // Generate dates for the timelapses (one per day for the last week)
    const dates = [];
    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    // Add image timelapses
    for (let i = 0; i < Math.min(imageUrls.length, dates.length); i++) {
      await db.insert(timelapseItems).values({
        taskId: imageTask.id,
        projectId: targetProjectId,
        name: `Construction Progress Day ${i + 1}`,
        description: `Aerial photo of construction site on ${dates[i].toLocaleDateString()}`,
        url: imageUrls[i],
        thumbnailUrl: imageUrls[i],
        mediaType: 'image',
        sourceType: 'url',
        captureDate: dates[i],
        metadata: { height: 1080, width: 1920, format: 'jpg' },
        fileSize: Math.floor(1024 * 1024 * (1 + Math.random() * 3)) // Random size between 1-4MB
      });
      console.log(`Added image timelapse item ${i + 1}`);
    }

    // Add video timelapses
    for (let i = 0; i < Math.min(videoUrls.length, dates.length); i++) {
      await db.insert(timelapseItems).values({
        taskId: videoTask.id,
        projectId: targetProjectId,
        name: `Drone Flyover Video ${i + 1}`,
        description: `Site flyover footage captured on ${dates[i].toLocaleDateString()}`,
        url: videoUrls[i],
        thumbnailUrl: imageUrls[i % imageUrls.length], // Use image URLs as thumbnails
        mediaType: 'video',
        sourceType: 'url',
        captureDate: dates[i],
        metadata: { duration: 30 + Math.floor(Math.random() * 60), format: 'mp4', resolution: '1080p' },
        fileSize: Math.floor(1024 * 1024 * (10 + Math.random() * 20)) // Random size between 10-30MB
      });
      console.log(`Added video timelapse item ${i + 1}`);
    }

    // Add 3D model timelapses
    for (let i = 0; i < Math.min(objUrls.length, dates.length); i++) {
      await db.insert(timelapseItems).values({
        taskId: objTask.id,
        projectId: targetProjectId,
        name: `Site 3D Model ${i + 1}`,
        description: `3D reconstruction from drone scan on ${dates[i].toLocaleDateString()}`,
        url: objUrls[i],
        thumbnailUrl: imageUrls[i % imageUrls.length], // Use image URLs as thumbnails
        mediaType: 'orthomosaic',
        sourceType: 'url',
        captureDate: dates[i],
        metadata: { vertices: 10000 + Math.floor(Math.random() * 50000), format: 'obj' },
        fileSize: Math.floor(1024 * 1024 * (50 + Math.random() * 100)) // Random size between 50-150MB
      });
      console.log(`Added 3D model timelapse item ${i + 1}`);
    }

    console.log('Successfully generated timelapse sample items');
  } catch (error) {
    console.error('Error generating timelapse samples:', error);
  }
}

main().then(() => {
  console.log('Timelapse generation script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
