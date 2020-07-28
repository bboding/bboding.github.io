"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cron_1 = require("cron");
const gifa_1 = require("./actions/gifa");
const jobs = [
    {
        name: 'gifa',
        cronTime: '0 44 8 * * *',
        action: gifa_1.gifa,
    },
    {
        name: 'gifa-buy-sell-count',
        cronTime: '0 3 9 * * *',
        action: gifa_1.gifaBuySellCount,
    },
];
console.log('스케쥴링이 시작되었습니다.');
for (const job of jobs) {
    new cron_1.CronJob(job.cronTime, () => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`${job.name} job has started.`);
        yield job.action();
        console.log(`${job.name} job has finished.`);
    }), null, true, 'Asia/Seoul');
}
