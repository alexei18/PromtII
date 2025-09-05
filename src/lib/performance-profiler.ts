// Performance profiler pentru identificarea bottleneck-urilor
// Integrează în aplicația ta pentru monitoring real-time

interface PerformanceMetric {
    operation: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}

class PerformanceProfiler {
    private metrics: PerformanceMetric[] = [];
    private activeOperations: Map<string, PerformanceMetric> = new Map();

    startOperation(operation: string, metadata?: Record<string, any>): string {
        const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const metric: PerformanceMetric = {
            operation,
            startTime: performance.now(),
            success: false,
            metadata
        };

        this.activeOperations.set(operationId, metric);
        console.log(`🟡 [PROFILER] Started: ${operation}`, metadata || '');

        return operationId;
    }

    endOperation(operationId: string, success: boolean = true, error?: string): void {
        const metric = this.activeOperations.get(operationId);
        if (!metric) return;

        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;
        metric.success = success;
        metric.error = error;

        this.metrics.push(metric);
        this.activeOperations.delete(operationId);

        const status = success ? '✅' : '❌';
        const durationStr = `${metric.duration.toFixed(0)}ms`;

        console.log(`${status} [PROFILER] Completed: ${metric.operation} in ${durationStr}`,
            error ? `Error: ${error}` : '');

        // Alert pentru operații lente
        if (metric.duration > 20000) { // 20s
            console.warn(`⚠️  [PROFILER] SLOW OPERATION: ${metric.operation} took ${durationStr}`);
        }

        // Alert pentru timeout potential
        if (metric.duration > 25000) { // 25s
            console.error(`🚨 [PROFILER] TIMEOUT RISK: ${metric.operation} took ${durationStr} - approaching 30s limit!`);
        }
    }

    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }

    getSlowOperations(thresholdMs: number = 10000): PerformanceMetric[] {
        return this.metrics.filter(m => m.duration && m.duration > thresholdMs);
    }

    generateReport(): string {
        const totalOperations = this.metrics.length;
        const successfulOps = this.metrics.filter(m => m.success).length;
        const failedOps = totalOperations - successfulOps;

        const slowOps = this.getSlowOperations(10000);
        const timeoutRiskOps = this.getSlowOperations(25000);

        const avgDuration = this.metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / totalOperations;

        const operationStats = this.metrics.reduce((acc, metric) => {
            if (!acc[metric.operation]) {
                acc[metric.operation] = { count: 0, totalDuration: 0, failures: 0 };
            }
            acc[metric.operation].count++;
            acc[metric.operation].totalDuration += metric.duration || 0;
            if (!metric.success) acc[metric.operation].failures++;
            return acc;
        }, {} as Record<string, { count: number; totalDuration: number; failures: number }>);

        let report = '\n' + '='.repeat(80) + '\n';
        report += '📊 PERFORMANCE REPORT\n';
        report += '='.repeat(80) + '\n';

        report += `Total Operations: ${totalOperations}\n`;
        report += `Successful: ${successfulOps} (${(successfulOps / totalOperations * 100).toFixed(1)}%)\n`;
        report += `Failed: ${failedOps} (${(failedOps / totalOperations * 100).toFixed(1)}%)\n`;
        report += `Average Duration: ${avgDuration.toFixed(0)}ms\n`;
        report += `Slow Operations (>10s): ${slowOps.length}\n`;
        report += `Timeout Risk Operations (>25s): ${timeoutRiskOps.length}\n\n`;

        report += '📈 OPERATION BREAKDOWN:\n';
        report += '-'.repeat(80) + '\n';
        Object.entries(operationStats).forEach(([operation, stats]) => {
            const avgDur = stats.totalDuration / stats.count;
            const failureRate = (stats.failures / stats.count * 100).toFixed(1);
            report += `${operation}:\n`;
            report += `  Count: ${stats.count}, Avg: ${avgDur.toFixed(0)}ms, Failures: ${failureRate}%\n`;
        });

        if (slowOps.length > 0) {
            report += '\n🐌 SLOW OPERATIONS:\n';
            report += '-'.repeat(80) + '\n';
            slowOps.forEach(op => {
                report += `${op.operation}: ${op.duration?.toFixed(0)}ms\n`;
                if (op.error) report += `  Error: ${op.error}\n`;
            });
        }

        if (timeoutRiskOps.length > 0) {
            report += '\n🚨 TIMEOUT RISK OPERATIONS:\n';
            report += '-'.repeat(80) + '\n';
            timeoutRiskOps.forEach(op => {
                report += `${op.operation}: ${op.duration?.toFixed(0)}ms ⚠️\n`;
                if (op.error) report += `  Error: ${op.error}\n`;
            });
        }

        report += '='.repeat(80) + '\n';
        return report;
    }

    // Helper function pentru wrapping operații automat
    async profileOperation<T>(
        operation: () => Promise<T>,
        operationName: string,
        metadata?: Record<string, any>
    ): Promise<T> {
        const operationId = this.startOperation(operationName, metadata);

        try {
            const result = await operation();
            this.endOperation(operationId, true);
            return result;
        } catch (error) {
            this.endOperation(operationId, false, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
}

// Singleton instance
export const profiler = new PerformanceProfiler();

// Helper pentru debugging local
export function enableLocalDebugging() {
    console.log('🔧 Local debugging enabled');

    // Log toate request-urile fetch
    const originalFetch = global.fetch;
    global.fetch = async (input, init) => {
        const startTime = performance.now();
        const url = input.toString();
        console.log(`🌐 [FETCH] Starting request to: ${url}`);

        try {
            const response = await originalFetch(input, init);
            const duration = performance.now() - startTime;
            console.log(`🌐 [FETCH] Completed ${url} in ${duration.toFixed(0)}ms - Status: ${response.status}`);
            return response;
        } catch (error) {
            const duration = performance.now() - startTime;
            console.log(`🌐 [FETCH] Failed ${url} after ${duration.toFixed(0)}ms - Error: ${error}`);
            throw error;
        }
    };

    // Automatic report generation la finalul testelor
    process.on('beforeExit', () => {
        console.log(profiler.generateReport());
    });

    process.on('SIGINT', () => {
        console.log(profiler.generateReport());
        process.exit(0);
    });
}

// Wrapper pentru actions cu profiling automat
export function profileAction<T extends (...args: any[]) => Promise<any>>(
    action: T,
    actionName: string
): T {
    return (async (...args: Parameters<T>) => {
        return profiler.profileOperation(
            () => action(...args),
            actionName,
            { args: args.map(arg => typeof arg === 'string' ? arg.substring(0, 100) : typeof arg) }
        );
    }) as T;
}
