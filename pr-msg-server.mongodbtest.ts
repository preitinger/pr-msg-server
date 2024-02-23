import { MongoClient, Db, MongoClientOptions } from "mongodb";
import { StandardMsgDoc, executeMsgReq } from "./pr-msg-server";
import { MsgReq, MsgResp } from "../pr-msg-common/pr-msg-common";

describe('pr-msg-server', () => {
    let connection: MongoClient | null = null;
    let db: Db | null = null;

    beforeAll(async () => {
        const MONGO_URI = process.env.MONGODB_URI;
        if (MONGO_URI == null) return;

        const options: MongoClientOptions = {
        }
        connection = await MongoClient.connect(MONGO_URI, options);
        db = connection.db('tests');
    });

    afterAll(async () => {
        if (connection != null) {
            await connection.close();
            connection = null;
            console.log('closed db con');
        }
    });
    test('executeMsgReq', async () => {
        if (db == null) throw new Error('db null');
        const col = db.collection<StandardMsgDoc>('testMsg');
        await col.deleteMany({});
        const embedPath = 'sth.msg';

        {
            const resp = await executeMsgReq('a', {
                type: 'pr-msg',
                user: 'a',
                ack: {},
                send: {}
            }, col, embedPath);
            expect(resp).toEqual({
                type: 'success',
                rcv: {}
            })
        }

        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'a',
                ack: {},
                send: {
                    'b': ['1', '2']
                }
            }
            const resp = await executeMsgReq('a', req, col, embedPath)
            expect(resp).toEqual({
                type: 'success',
                rcv: {}
            })
        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'b',
                ack: {},
                send: {}
            }
            const resp = await executeMsgReq('b', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    ['a']: {
                        cnt: 2,
                        msg: ['1', '2']
                    }
                }

            }
            expect (resp).toEqual(expectedResp)
        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'b',
                ack: {
                    'a': 2
                },
                send: {}
            }
            const resp = await executeMsgReq('b', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    ['a']: {
                        cnt: 2,
                        msg: []
                    }
                }

            }
            expect (resp).toEqual(expectedResp)
        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'a',
                ack: {},
                send: {
                    'b': ['3']
                }
            }
            const resp = await executeMsgReq('a', req, col, embedPath)
            expect(resp).toEqual({
                type: 'success',
                rcv: {}
            })

        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'b',
                ack: {
                    'a': 2
                },
                send: {}
            }
            const resp = await executeMsgReq('b', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    ['a']: {
                        cnt: 3,
                        msg: ['3']
                    }
                }

            }
            expect (resp).toEqual(expectedResp)
        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'a',
                ack: {},
                send: {
                    'b': ['4']
                }
            }
            const resp = await executeMsgReq('a', req, col, embedPath)
            expect(resp).toEqual({
                type: 'success',
                rcv: {}
            })

        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'b',
                ack: {
                    'a': 3
                },
                send: {}
            }
            const resp = await executeMsgReq('b', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    ['a']: {
                        cnt: 4,
                        msg: ['4']
                    }
                }

            }
            expect (resp).toEqual(expectedResp)
        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'b',
                ack: {
                    'a': 4
                },
                send: {}
            }
            const resp = await executeMsgReq('b', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    ['a']: {
                        cnt: 4,
                        msg: []
                    }
                }

            }
            expect (resp).toEqual(expectedResp)
        }

        // and finally send and rcv in one request and to/from several users
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'a',
                ack: {
                },
                send: {
                    'b': ['a.b.1', 'a.b.2'],
                    'c': ['a.c.1', 'a.c.2']
                }
            }
            const resp = await executeMsgReq('a', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                }

            }
            expect (resp).toEqual(expectedResp)
        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'b',
                ack: {
                    a: 4
                },
                send: {
                    'a': ['b.a.1', 'b.a.2'],
                    'c': ['b.c.1', 'b.c.2']
                }
            }
            const resp = await executeMsgReq('b', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    a: {
                        cnt: 6,
                        msg: ['a.b.1', 'a.b.2']
                    }
                }
            }
            expect (resp).toEqual(expectedResp)
        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'c',
                ack: {
                },
                send: {
                    'a': ['c.a.1', 'c.a.2'],
                    'b': ['c.b.1', 'c.b.2']
                }
            }
            const resp = await executeMsgReq('c', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    a: {
                        cnt: 2,
                        msg: ['a.c.1', 'a.c.2']
                    },
                    b: {
                        cnt: 2,
                        msg: ['b.c.1', 'b.c.2']
                    }
                }
            }
            expect (resp).toEqual(expectedResp)
        }

        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'a',
                ack: {
                },
                send: {
                    'b': ['a.b.3', 'a.b.4'],
                    'c': ['a.c.3', 'a.c.4']
                }
            }
            const resp = await executeMsgReq('a', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    b: {
                        cnt: 2,
                        msg: ['b.a.1', 'b.a.2']
                    },
                    c: {
                        cnt: 2,
                        msg: ['c.a.1', 'c.a.2']
                    }
                }

            }
            expect (resp).toEqual(expectedResp)
        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'b',
                ack: {
                    a: 6
                },
                send: {
                    'a': ['b.a.3', 'b.a.4'],
                    'c': ['b.c.3', 'b.c.4']
                }
            }
            const resp = await executeMsgReq('b', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    a: {
                        cnt: 8,
                        msg: ['a.b.3', 'a.b.4']
                    },
                    c: {
                        cnt: 2,
                        msg: ['c.b.1', 'c.b.2']
                    }
                }
            }
            expect (resp).toEqual(expectedResp)
        }
        {
            const req: MsgReq = {
                type: 'pr-msg',
                user: 'c',
                ack: {
                    a: 2,
                    b: 2,
                },
                send: {
                    'a': ['c.a.3', 'c.a.4'],
                    'b': ['c.b.3', 'c.b.4']
                }
            }
            const resp = await executeMsgReq('c', req, col, embedPath);
            const expectedResp: MsgResp = {
                type: 'success',
                rcv: {
                    a: {
                        cnt: 4,
                        msg: ['a.c.3', 'a.c.4']
                    },
                    b: {
                        cnt: 4,
                        msg: ['b.c.3', 'b.c.4']
                    }
                }
            }
            expect (resp).toEqual(expectedResp)
        }

  })
})