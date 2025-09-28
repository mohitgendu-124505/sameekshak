import Bull from 'bull';
import { IStorage } from './storage.js';
import { processAIForComment } from './routes.js';

export interface CSVJobData {
  jobId: string;
  policyId: string;
  filename: string;
  uploaderId: string;
  csvData: any[];
}

export class QueueService {
  private csvQueue: Bull.Queue<CSVJobData>;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    
    // Initialize Bull queue with Redis (or in-memory for development)
    this.csvQueue = new Bull('csv processing', {
      redis: process.env.REDIS_URL || {
        host: 'localhost',
        port: 6379,
      },
      // For development without Redis, use in-memory storage
      ...(process.env.NODE_ENV === 'development' && !process.env.REDIS_URL && {
        redis: {
          host: 'localhost',
          port: 6379,
          maxRetriesPerRequest: 0,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 0,
        }
      })
    });

    this.setupQueueProcessors();
  }

  private setupQueueProcessors() {
    // Process CSV jobs
    this.csvQueue.process('process-csv', 1, async (job) => {
      const { jobId, policyId, filename, uploaderId, csvData } = job.data;
      
      try {
        // Update job status to processing
        await this.storage.updateCsvJob(jobId, {
          status: 'processing',
          processedRows: 0,
          errors: []
        });

        let processedRows = 0;
        const errors: string[] = [];

        // Process each row
        for (let i = 0; i < csvData.length; i++) {
          const row = csvData[i];
          
          try {
            // Create comment from CSV row
            const comment = await this.storage.createComment({
              policyId,
              text: row.comment || row.text || '',
              mood: row.mood || null,
              userId: null, // Anonymous comments from CSV
              city: row.city || null,
              state: row.state || null,
              lat: row.lat ? parseFloat(row.lat) : null,
              lon: row.lon ? parseFloat(row.lon) : null,
              aiSummaryShort: null,
              aiSummaryDetailed: null,
              aiSentimentScore: null,
              keywords: null
            });

            // Process AI analysis for the comment
            if (comment.text && comment.text.trim().length > 0) {
              await processAIForComment(comment.id, comment.text, this.storage);
            }

            processedRows++;
            
            // Update progress every 10 rows
            if (processedRows % 10 === 0) {
              await this.storage.updateCsvJob(jobId, {
                processedRows,
                errors
              });
              
              // Update job progress
              job.progress(Math.round((processedRows / csvData.length) * 100));
            }

          } catch (error) {
            const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`Error processing CSV row ${i + 1}:`, error);
          }
        }

        // Mark job as completed
        await this.storage.updateCsvJob(jobId, {
          status: 'completed',
          processedRows,
          errors,
          finishedAt: new Date()
        });

        job.progress(100);
        return { success: true, processedRows, errors };

      } catch (error) {
        // Mark job as failed
        await this.storage.updateCsvJob(jobId, {
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          finishedAt: new Date()
        });

        throw error;
      }
    });

    // Handle job completion
    this.csvQueue.on('completed', (job, result) => {
      console.log(`CSV job ${job.id} completed:`, result);
    });

    // Handle job failure
    this.csvQueue.on('failed', (job, err) => {
      console.error(`CSV job ${job.id} failed:`, err);
    });
  }

  async addCSVJob(data: CSVJobData): Promise<Bull.Job<CSVJobData>> {
    return await this.csvQueue.add('process-csv', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10, // Keep last 10 completed jobs
      removeOnFail: 5, // Keep last 5 failed jobs
    });
  }

  async getJobStatus(jobId: string): Promise<Bull.Job<CSVJobData> | null> {
    const job = await this.csvQueue.getJob(jobId);
    return job;
  }

  async getJobsByPolicy(policyId: string): Promise<Bull.Job<CSVJobData>[]> {
    const jobs = await this.csvQueue.getJobs(['completed', 'failed', 'active', 'waiting'], 0, -1);
    return jobs.filter(job => job.data.policyId === policyId);
  }

  async pauseQueue(): Promise<void> {
    await this.csvQueue.pause();
  }

  async resumeQueue(): Promise<void> {
    await this.csvQueue.resume();
  }

  async close(): Promise<void> {
    await this.csvQueue.close();
  }
}

// Global queue instance
let queueService: QueueService | null = null;

export function getQueueService(storage: IStorage): QueueService {
  if (!queueService) {
    queueService = new QueueService(storage);
  }
  return queueService;
}
