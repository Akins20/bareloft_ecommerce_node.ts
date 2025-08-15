/**
 * Job System Testing Script
 * 
 * This script tests the Bull Queue background job system by:
 * 1. Testing job queue health endpoints
 * 2. Creating test jobs for different processors
 * 3. Monitoring job execution
 * 4. Verifying job completion
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3007';

// Test configuration
const config = {
  // Mock authentication token - in real usage, this would be obtained through login
  adminToken: 'Bearer test-admin-token',
  testEmail: 'test@bareloft.com',
  testUserId: 'test-user-123'
};

class JobSystemTester {
  constructor() {
    this.results = [];
  }

  log(message, status = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${status}: ${message}`;
    console.log(logMessage);
    this.results.push({ timestamp, status, message });
  }

  async makeRequest(method, endpoint, data = null, requiresAuth = true) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (requiresAuth) {
        headers['Authorization'] = config.adminToken;
      }

      const requestConfig = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers,
        timeout: 10000
      };

      if (data) {
        requestConfig.data = data;
      }

      const response = await axios(requestConfig);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async testServerHealth() {
    this.log('🔍 Testing server health...');
    
    const response = await this.makeRequest('GET', '/health', null, false);
    if (response.success) {
      this.log('✅ Server is healthy', 'SUCCESS');
      return true;
    } else {
      this.log(`❌ Server health check failed: ${response.error}`, 'ERROR');
      return false;
    }
  }

  async testJobSystemHealth() {
    this.log('🔍 Testing job system health...');
    
    const response = await this.makeRequest('GET', '/api/admin/jobs/health');
    if (response.success) {
      this.log('✅ Job system is healthy', 'SUCCESS');
      this.log(`📊 System stats: ${JSON.stringify(response.data.data, null, 2)}`, 'INFO');
      return true;
    } else {
      this.log(`❌ Job system health check failed: ${JSON.stringify(response.error)}`, 'ERROR');
      return false;
    }
  }

  async testQueueStats() {
    this.log('📊 Getting queue statistics...');
    
    const response = await this.makeRequest('GET', '/api/admin/jobs/stats');
    if (response.success) {
      this.log('✅ Queue statistics retrieved successfully', 'SUCCESS');
      const stats = response.data.data;
      
      this.log(`📈 Queue Summary:`, 'INFO');
      this.log(`   - Total Queues: ${stats.queueStats.length}`, 'INFO');
      this.log(`   - Health Status: ${stats.health.healthy ? 'Healthy' : 'Unhealthy'}`, 'INFO');
      
      stats.queueStats.forEach(queue => {
        this.log(`   - ${queue.name}: waiting=${queue.waiting}, active=${queue.active}, completed=${queue.completed}, failed=${queue.failed}`, 'INFO');
      });
      
      return stats;
    } else {
      this.log(`❌ Failed to get queue statistics: ${JSON.stringify(response.error)}`, 'ERROR');
      return null;
    }
  }

  async testEmailJob() {
    this.log('📧 Testing email job creation...');
    
    const testData = {
      email: config.testEmail,
      type: 'test'
    };

    const response = await this.makeRequest('POST', '/api/admin/jobs/email/test', testData);
    if (response.success) {
      this.log(`✅ Email job created successfully - Job ID: ${response.data.data.jobId}`, 'SUCCESS');
      return response.data.data.jobId;
    } else {
      this.log(`❌ Failed to create email job: ${JSON.stringify(response.error)}`, 'ERROR');
      return null;
    }
  }

  async testNotificationJob() {
    this.log('📱 Testing notification job creation...');
    
    const testData = {
      userId: config.testUserId,
      channels: ['in_app']
    };

    const response = await this.makeRequest('POST', '/api/admin/jobs/notification/test', testData);
    if (response.success) {
      this.log(`✅ Notification job created successfully - Job ID: ${response.data.data.jobId}`, 'SUCCESS');
      return response.data.data.jobId;
    } else {
      this.log(`❌ Failed to create notification job: ${JSON.stringify(response.error)}`, 'ERROR');
      return null;
    }
  }

  async testJobDetails(jobId) {
    this.log(`🔍 Testing job details retrieval for job: ${jobId}...`);
    
    const response = await this.makeRequest('GET', `/api/admin/jobs/${jobId}`);
    if (response.success) {
      const job = response.data.data.job;
      this.log(`✅ Job details retrieved successfully`, 'SUCCESS');
      this.log(`   - Job ID: ${job.id}`, 'INFO');
      this.log(`   - Job Name: ${job.name}`, 'INFO');
      this.log(`   - Progress: ${job.progress}%`, 'INFO');
      this.log(`   - Attempts: ${job.attemptsMade}`, 'INFO');
      this.log(`   - Status: ${job.finishedOn ? 'Completed' : (job.processedOn ? 'Processing' : 'Pending')}`, 'INFO');
      return job;
    } else {
      this.log(`❌ Failed to get job details: ${JSON.stringify(response.error)}`, 'ERROR');
      return null;
    }
  }

  async testQueueOperations() {
    this.log('🔧 Testing queue operations (pause/resume)...');
    
    // Test pausing email queue
    let response = await this.makeRequest('POST', '/api/admin/jobs/queues/email/pause');
    if (response.success) {
      this.log('✅ Successfully paused email queue', 'SUCCESS');
    } else {
      this.log(`❌ Failed to pause email queue: ${JSON.stringify(response.error)}`, 'ERROR');
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test resuming email queue
    response = await this.makeRequest('POST', '/api/admin/jobs/queues/email/resume');
    if (response.success) {
      this.log('✅ Successfully resumed email queue', 'SUCCESS');
    } else {
      this.log(`❌ Failed to resume email queue: ${JSON.stringify(response.error)}`, 'ERROR');
    }
  }

  async waitAndCheckJobCompletion(jobIds, maxWaitTime = 30000) {
    this.log(`⏳ Waiting for jobs to complete (max ${maxWaitTime/1000}s)...`);
    
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      let allCompleted = true;
      
      for (const jobId of jobIds) {
        if (jobId) {
          const job = await this.testJobDetails(jobId);
          if (job && !job.finishedOn) {
            allCompleted = false;
          }
        }
      }
      
      if (allCompleted) {
        this.log('✅ All jobs completed successfully!', 'SUCCESS');
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    this.log(`⚠️ Timeout reached - some jobs may still be processing`, 'WARNING');
    return false;
  }

  async runFullTest() {
    this.log('🚀 Starting comprehensive job system test...', 'START');
    
    try {
      // 1. Test server health
      const serverHealthy = await this.testServerHealth();
      if (!serverHealthy) {
        this.log('❌ Server is not healthy, aborting tests', 'ERROR');
        return this.generateReport();
      }

      // 2. Test job system health
      const jobSystemHealthy = await this.testJobSystemHealth();
      if (!jobSystemHealthy) {
        this.log('❌ Job system is not healthy, aborting tests', 'ERROR');
        return this.generateReport();
      }

      // 3. Get initial queue statistics
      await this.testQueueStats();

      // 4. Test job creation
      const emailJobId = await this.testEmailJob();
      const notificationJobId = await this.testNotificationJob();

      // 5. Monitor job execution
      const jobIds = [emailJobId, notificationJobId].filter(id => id !== null);
      if (jobIds.length > 0) {
        await this.waitAndCheckJobCompletion(jobIds, 30000);
      }

      // 6. Test queue operations
      await this.testQueueOperations();

      // 7. Get final queue statistics
      this.log('📊 Getting final queue statistics...', 'INFO');
      await this.testQueueStats();

      this.log('🎉 Job system test completed successfully!', 'SUCCESS');

    } catch (error) {
      this.log(`❌ Test failed with error: ${error.message}`, 'ERROR');
    }

    return this.generateReport();
  }

  generateReport() {
    const successCount = this.results.filter(r => r.status === 'SUCCESS').length;
    const errorCount = this.results.filter(r => r.status === 'ERROR').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;

    console.log('\n' + '='.repeat(80));
    console.log('📋 JOB SYSTEM TEST REPORT');
    console.log('='.repeat(80));
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log(`📊 Total operations: ${this.results.length}`);
    console.log('='.repeat(80));

    if (errorCount === 0) {
      console.log('🎉 All tests passed! Job system is working correctly.');
    } else {
      console.log('❌ Some tests failed. Check the logs above for details.');
    }

    return {
      success: errorCount === 0,
      summary: {
        total: this.results.length,
        successful: successCount,
        failed: errorCount,
        warnings: warningCount
      },
      details: this.results
    };
  }
}

// Run the test
async function runJobSystemTest() {
  const tester = new JobSystemTester();
  await tester.runFullTest();
}

// Export for potential module usage
if (require.main === module) {
  runJobSystemTest().catch(console.error);
}

module.exports = { JobSystemTester, runJobSystemTest };