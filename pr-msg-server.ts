import { Collection, Document, Filter, WithId } from "mongodb";
import { MsgReq, MsgResp, ReceivedMsg } from "../pr-msg-common/pr-msg-common";
import { ApiResp } from "../user-management-server/user-management-common/apiRoutesCommon";

export interface StandardMsgDoc {
    /**
     * receiving user
     */
    _id: string;
    msg: {
        [sender: string]: {
            cnt: number;
            msg: string[];
        }
    }
}

export async function executeMsgReq(validatedUser: string, req: MsgReq, col: Collection<any>, embedPath: string): Promise<ApiResp<MsgResp>> {
    if (!embedPath.endsWith('.')) {
        embedPath += '.';
    }
    if (req.user !== validatedUser) {
        return {
            type: 'error',
            error: 'no-auth'
        }
    }
    const pushPromises = Object.entries(req.send).map(async ([receiver, msg]) => 
        col.updateOne({
            _id: receiver
        }, {
            $inc: {
                [`${embedPath}${validatedUser}.cnt`]: msg.length
            },
            $push: {
                [`${embedPath}${validatedUser}.msg`]: {
                    $each: msg
                }
            }
        }, {
            upsert: true
        })
    );

    const setDoc: any = {};
    for (const sender in req.ack) {
        const prefix = embedPath + sender + '.';

        const msg = prefix + 'msg';
        const cnt = prefix + 'cnt';
        if (req.ack[sender] <= 0) continue;
        setDoc[msg] = {
            // keep only the non-acknowledged messages from sender in the array msg which are
            // $cnt - req.ack[sender] because $cnt is the number of all messages ever
            // sent from sender (not only the current number in the array) because
            // the array contains only non-acknowledged messages.
            $slice: [
                '$' + msg,
                {
                    $subtract: [
                        req.ack[sender],
                        '$' + cnt
                    ]
                }
            ]
        }
    }

    const fetchRes = await col.findOneAndUpdate({
        _id: validatedUser
    }, [
        {
            $set: setDoc
        }
    ], {
        returnDocument: 'after'
    })

    const rcv: {
        [sender: string]: ReceivedMsg;
    } = fetchRes == null ? {} : (embedPath.substring(0, embedPath.length - 1).split('.').reduce((o,i)=> o[i], fetchRes) ?? {});
    

    const resp: MsgResp = {
        type: 'success',
        rcv: rcv
    }
    await Promise.all(pushPromises);
    return resp;
}