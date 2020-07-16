declare module testableUtils {
    namespace log {
        function fatal(message: any);
        function info(message: any);
        function error(message: any);
        function debug(message: any);
        function trace(message: any);
    }

    interface events {
        addListener(event: string | symbol, listener: (...args: any[]) => void): this;
        on(event: string | symbol, listener: (...args: any[]) => void): this;
        once(event: string | symbol, listener: (...args: any[]) => void): this;
        removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
        off(event: string | symbol, listener: (...args: any[]) => void): this;
        removeAllListeners(event?: string | symbol): this;
        setMaxListeners(n: number): this;
        getMaxListeners(): number;
        listeners(event: string | symbol): Function[];
        rawListeners(event: string | symbol): Function[];
        emit(event: string | symbol, ...args: any[]): boolean;
        listenerCount(type: string | symbol): number;
        // Added in Node 6...
        prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
        prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
        eventNames(): Array<string | symbol>;
    }

    function execute(func: Function)

    namespace dataTable {
        function open()
        namespace open{
            function get(i: number);
            function random();
            function next(options?: object);
        }
    }

    function results()

    namespace results {
        function toResourceName(url: string)
    }

    function stopwatch(func: Function, param1?: string, param2?: string)

    function waitForFinish()

    var isLocal: boolean;
    var isSmokeTest: boolean;
    var info: any;

}

export = testableUtils;
