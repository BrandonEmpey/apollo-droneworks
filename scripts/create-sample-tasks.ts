import { db } from '../server/db';
import { projectTasks } from '../shared/schema';

/**
 * This script creates sample tasks for a project if they don't exist
 * to be used with the timelapse sample generator
 */

async function main() {
  try {
    console.log('Starting to create sample tasks...');

    // Define target project ID
    const targetProjectId = 14; // You may need to change this to a valid project ID
    
    // First check if the project exists
    const project = await db.query.clientProjects.findFirst({
      where: (project, { eq }) => eq(project.id, targetProjectId)
    });

    if (!project) {
      console.error(`Project with ID ${targetProjectId} not found`);
      return;
    }

    console.log(`Adding tasks to project ID ${targetProjectId}: ${project.name}`);

    // Get existing tasks for this project
    const existingTasks = await db.query.projectTasks.findMany({
      where: (task, { eq }) => eq(task.projectId, targetProjectId)
    });

    console.log(`Found ${existingTasks.length} existing tasks`);

    // Sample task names
    const sampleTasks = [
      {
        name: 'Photo Documentation',
        description: 'Regular photo documentation of the construction site',
        status: 'in_progress',
        priority: 'high'
      },
      {
        name: 'Aerial Video Capture',
        description: 'Weekly video recordings of site progress',
        status: 'in_progress',
        priority: 'medium'
      },
      {
        name: '3D Site Modeling',
        description: 'Photogrammetry and 3D model creation of the site',
        status: 'in_progress',
        priority: 'high'
      }
    ];

    // Only create tasks if there are fewer than 3
    if (existingTasks.length < 3) {
      for (const taskData of sampleTasks) {
        // Check if a task with this name already exists
        const exists = existingTasks.some(task => task.name === taskData.name);
        
        if (!exists) {
          // Set due date to 2 weeks from now
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 14);
          
          await db.insert(projectTasks).values({
            projectId: targetProjectId,
            name: taskData.name,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            dueDate: dueDate,
            assignedTo: null, // Assign to appropriate user if needed
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`Created task: ${taskData.name}`);
        } else {
          console.log(`Task '${taskData.name}' already exists, skipping`);
        }
      }
    } else {
      console.log('Project already has enough tasks, skipping creation');
    }

    console.log('Successfully created sample tasks');
  } catch (error) {
    console.error('Error creating sample tasks:', error);
  }
}

main().then(() => {
  console.log('Task creation script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
