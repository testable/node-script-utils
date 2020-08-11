import {EventEmitter} from "events";

declare namespace testableUtils {
    var isLocal: boolean;
    var isSmokeTest: boolean;
    var events: EventEmitter;

    function execute(func: Function)

    function stopwatch(code: Function, metricName?: string, resource?: string)

    function waitForFinish(): Promise<void>


    interface Log {
        fatal(message: any);
        info(message: any);
        error(message: any);
        debug(message: any);
        trace(message: any);
    }
    var log: Log;


    interface DataRow {
        index: number;
        data: object;
        indexed: Array<any>;
    }
    interface DataTable{
        get(i: number): Promise<DataRow>
        random(): Promise<DataRow>
        next(options?: object): Promise<Array<DataRow>>
    }
    var dataTable: {
        open(name: string): DataTable
    };


    interface Chunk{
        id: number,
        executionType: string,
        agent: string,
        createdAt: Date,
        updatedAt: Date,
        startedAt: Date,
        concurrentClients: number
    }
    interface Execution{
        id: number,
        createdAt: Date,
        updatedAt: Date,
        startedAt: Date,
        concurrentClients: number
    }
    interface Region {
        id: number,
        createdAt: Date,
        updatedAt: Date,
        name: string,
        public: boolean,
        latitude: number,
        longitude: number,
        description: string,
        active: boolean
    }
    var info: {
        expectedFinishTimestamp: number,
        iteration: number,
        client: number,
        globalClientIndex: number,
        regionalClientIndex: number,
        chunk: Chunk,
        agent: string,
        execution: Execution,
        region: Region,
        outputDir: string
    }


    interface ValueCondition {
        value: number;
        name: string;
        key?: string;
    }
    interface Condition {
        condition: (val: number) => boolean;
        name: string;
        key?: string;
    }
    interface Result {
        timing(options: ResultOptions): Promise<void>;
        timing(name: string, key?: string, val?: number, units?: string): Promise<void>;
        counter(options: ResultOptions): Promise<void>;
        counter(name: string, key?: string, val?: number, units?: string): Promise<void>;
        histogram(options: ResultOptions): Promise<void>;
        histogram(name: string, key?: string, val?: number, units?: string): Promise<void>;
        metered(options: ResultOptions): Promise<void>;
        metered(name: string, key?: string, val?: number, units?: string): Promise<void>;
        setTraceStatus(status: string): void;
        markAsSuccess(): void;
        markAsFailure(): void;

        data:{resource: string, url: string},
    }
    interface ResultOptions {
        name: string;
        key?: string;
        val?: number;
        units?: string;
    }
    interface GetOptions {
        name: string;
        key?: string;
    }
    var results: {
        (resource?: string, url?: string): Result;
        get(options: GetOptions): Promise<number>;
        get(name: string, key?: string): Promise<number>;
        waitForCondition(options: Condition): Promise<void>;
        waitForValue(options: ValueCondition): Promise<void>;
        incrementAndWaitForValue(name: string, value: number): Promise<void>;
        barrier(name: string, value: number): Promise<void>;
        toResourceName: (url: string) => string;
        current: Result;
    }

}

declare module "testable-utils" {
    export = testableUtils
}

declare namespace WebdriverIO {
    interface Browser {
        testableLogTrace: () => any;
        testableLogDebug: () => any;
        testableLogInfo: () => any;
        testableLogError: () => any;
        testableLogFatal: () => any;
        testableCsvGet: (name: string, index: number) => any;
        testableCsvRandom: (name: string) => any;
        testableCsvNext: (name: string, options: any) => any;
        testableResult: (resource: string, url: string) => any;
        testableTiming: (result: any) => any;
        testableCounter: (result: any) => any;
        testableHistogram: (result: any) => any;
        testableMetered: (result: any) => any;
        testableGetMetric: () => any;
        testableWaitForValue: (options: any) => any;
        testableWaitForCondition: (options: any) => any;
        testableIncrementAndWaitForValue: (options: any) => any;
        testableBarrier: (name: string, value: any) => any;
        testableInfo: () => any;

        testableScreenshot: (name: string) => any;
        testableStopwatch: (code: string, metricName: string, resource: string) => any;
        testableWaitForEvent: (eventName: string, timeout: number, defaultVal: any) => any;

        testableWaitForFinish: () => any;
    }
}

declare module "@wdio/sync" {
    export = WebdriverIO
}
