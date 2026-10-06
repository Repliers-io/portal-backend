import { injectable } from "tsyringe";
import _debug from "debug";
import BaseEventCollectionSelector from "./baseEventCollectionSelector.js";
import { BossNoteCreateRequest } from "../../boss.js";
import { RplEstimateSingle } from "../../../services/repliers/estimate.js";
const debug = _debug("repliers:services:SelectScheduleEstimateNoteParams");
export interface ScheduleEstimateNoteParams {
   estimate: RplEstimateSingle;
   date: string;
   time: string;
}
@injectable()
export default class SelectScheduleEstimateNoteParams {
   constructor(private baseEventCollectionSelector: BaseEventCollectionSelector) {}
   select = async (params: ScheduleEstimateNoteParams): Promise<BossNoteCreateRequest> => {
      debug("[SelectEstimateNoteParams] estimateParams %O", params);
      const {
         estimate,
         date,
         time
      } = params;
      const addressShort = estimate.payload?.address ? this.baseEventCollectionSelector.addressShort(estimate.payload.address) : "unknown address";
      const price = this.baseEventCollectionSelector.formatPrice(estimate?.estimate);
      const estimateUrl = this.baseEventCollectionSelector.getEstimateUrl(estimate);
      const city = estimate.payload?.address?.city || "unknown city";
      const payload = {
         subject: `Client requested to schedule a meeting regarding estimate`,
         body: `<p>User requested a meeting to be held on <b>${date} at ${time}.</b>. <br /><b>${price}</b> property at <b>${addressShort}, ${city}</b>. Click <a href="${estimateUrl}" target="__blank">here</a> to view estimate details.</p>`,
         isHtml: true
      } as BossNoteCreateRequest;
      return payload;
   };
}