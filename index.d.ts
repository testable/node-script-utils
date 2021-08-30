import {EventEmitter} from "events";

declare namespace testableUtils {
    var isLocal: boolean;
    var isSmokeTest: boolean;
    var events: EventEmitter;

    function init(): void;

    function execute(func: Function)

    function stopwatch(code: Function, metricName?: string, resource?: string)

    function waitForFinish(): Promise<void>

    function describe(suiteName: string, fn: Function): Promise<void>;

    function it(testName: string, fn: Function): Promise<void>;

    function before(fn: Function): void;

    function after(fn: Function): void;

    function beforeEach(fn: Function): void;

    function afterEach(fn: Function): void;


    interface Log {
        debug(message?: any);
        error(message?: any);
        fatal(message?: any);
        info(message?: any);
        trace(message?: any);
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


    interface Chunk {
        id: number,
        executionType: string,
        agent: string,
        createdAt: Date,
        updatedAt: Date,
        startedAt: Date,
        concurrentClients: number
    }
    interface Execution {
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
        name: string;
        value?: number;
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

        data: { resource: string, url: string },
    }
    interface ResultOptions {
        namespace?: string;
        name: string;
        key?: string;
        val?: number;
        units?: string;
    }
    interface GetOptions {
        namespace?: string;
        name: string;
        key?: string;
    }
    var results: {
        (resource?: string, url?: string): Result;
        get(options: GetOptions): Promise<number>;
        get(name: string, key?: string): Promise<number>;
        waitForCondition(options: Condition): Promise<void>;
        waitForValue(options: ValueCondition): Promise<void>;
        incrementAndWaitForValue(name: string, value?: number): Promise<void>;
        barrier(name: string, value?: number): Promise<void>;
        toResourceName: (url: string) => string;
        current: Result;
    }

}

export = testableUtils

declare global {
    namespace WebdriverIO {
        interface Browser {
            testableLogDebug: (message?: any) => any;
            testableLogError: (message?: any) => any;
            testableLogFatal: (message?: any) => any;
            testableLogInfo: (message?: any) => any;
            testableLogTrace: (message?: any) => any;
            testableCsvGet: (name: string, index: number) => Promise<testableUtils.DataRow>
            testableCsvRandom: (name: string) => Promise<testableUtils.DataRow>;
            testableCsvNext: (name: string, options?: any) => Promise<Array<testableUtils.DataRow>>
            testableResult: (resource?: string, url?: string) => any;
            testableTiming: (result: any, options: testableUtils.ResultOptions) => Promise<void>;
            testableCounter: (result: any, options: testableUtils.ResultOptions) => Promise<void>;
            testableHistogram: (result: any, options: testableUtils.ResultOptions) => Promise<void>;
            testableMetered: (result: any, options: testableUtils.ResultOptions) => Promise<void>;
            testableGetMetric: () => any;
            testableWaitForCondition: (options: testableUtils.Condition) => Promise<void>;
            testableWaitForValue: (options: testableUtils.ValueCondition) => Promise<void>;
            testableIncrementAndWaitForValue: (name: string, value?: number) => Promise<void>;
            testableBarrier: (name: string, value?: any) => any;
            testableInfo: () => any;

            testableScreenshot: (name: string) => any;
            testableStopwatch: (code: Function, metricName?: string, resource?: string) => any;
            testableWaitForEvent: (eventName: string, timeout?: number, defaultVal?: any) => any;

            testableWaitForFinish: () => Promise<void>;
        }
    }
}

declare module "webdriverio/sync" {
    export = WebdriverIO
}
