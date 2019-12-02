import { getConnection } from 'typeorm'
import { initConnection } from '../../../src/database/chain/ormconfig'
import { ScriptHashType, Script, TransactionWithoutHash } from '../../../src/types/cell-types'
import { OutputStatus } from '../../../src/services/tx/params'
import OutputEntity from '../../../src/database/chain/entities/output'
import TransactionGenerator from '../../../src/services/tx/transaction-generator'
import LockUtils from '../../../src/models/lock-utils'
import DaoUtils from '../../../src/models/dao-utils'
import TransactionSize from '../../../src/models/transaction-size'
import TransactionFee from '../../../src/models/transaction-fee'

const systemScript = {
  outPoint: {
    txHash: '0xb815a396c5226009670e89ee514850dcde452bca746cdd6b41c104b50e559c70',
    index: '0',
  },
  codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
  hashType: ScriptHashType.Type,
}

const daoScript = {
  outPoint: {
    txHash: '0xa563884b3686078ec7e7677a5f86449b15cf2693f3c1241766c6996f206cc541',
    index: '2',
  },
  codeHash: '0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e',
  hashType: ScriptHashType.Type,
}

const randomHex = (length: number = 64): string => {
  const str: string = Array.from({ length })
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('')

  return `0x${str}`
}

const toShannon = (ckb: string) => `${ckb}00000000`

const bob = {
  lockScript: {
    codeHash: '0x1892ea40d82b53c678ff88312450bbb17e164d7a3e0a90941aa58839f56f8df2',
    args: '0x36c329ed630d6ce750712a477543672adab57f4c',
    hashType: ScriptHashType.Type,
  },
  lockHash: '0xecaeea8c8581d08a3b52980272001dbf203bc6fa2afcabe7cc90cc2afff488ba',
  address: 'ckt1qyqrdsefa43s6m882pcj53m4gdnj4k440axqswmu83',
  blake160: '0x36c329ed630d6ce750712a477543672adab57f4c',
}

const alice = {
  lockScript: {
    codeHash: '0x1892ea40d82b53c678ff88312450bbb17e164d7a3e0a90941aa58839f56f8df2',
    args: '0xe2193df51d78411601796b35b17b4f8f2cd85bd0',
    hashType: ScriptHashType.Type,
  },
  lockHash: '0x489306d801d54bee2d8562ae20fdc53635b568f8107bddff15bb357f520cc02c',
  address: 'ckt1qyqwyxfa75whssgkq9ukkdd30d8c7txct0gqfvmy2v',
  blake160: '0xe2193df51d78411601796b35b17b4f8f2cd85bd0',
}

describe('TransactionGenerator', () => {
  beforeAll(async () => {
    await initConnection('0x1234')
    const mockContractInfo = jest.fn()
    mockContractInfo.mockReturnValue(systemScript)
    LockUtils.systemScript = mockContractInfo.bind(LockUtils)

    const mockDaoScriptInfo = jest.fn()
    mockDaoScriptInfo.mockReturnValue(daoScript)
    DaoUtils.daoScript = mockDaoScriptInfo.bind(DaoUtils)
  })

  afterAll(async () => {
    await getConnection().close()
  })

  const generateCell = (
    capacity: string,
    status: OutputStatus,
    hasData: boolean,
    typeScript: Script | null,
    who: any = bob
  ) => {
    const output = new OutputEntity()
    output.outPointTxHash = randomHex()
    output.outPointIndex = '0'
    output.capacity = capacity
    output.lock = who.lockScript
    output.lockHash = who.lockHash
    output.status = status
    output.hasData = hasData
    output.typeScript = typeScript

    return output
  }

  beforeEach(async done => {
    const connection = getConnection()
    await connection.synchronize(true)
    done()
  })

  describe('generateTx', () => {
    beforeEach(async done => {
      const cells: OutputEntity[] = [
        generateCell(toShannon('1000'), OutputStatus.Live, false, null),
        generateCell(toShannon('2000'), OutputStatus.Live, false, null),
      ]
      await getConnection().manager.save(cells)
      done()
    })

    describe('with feeRate 1000', () => {
      it('capacity 500', async () => {
        const feeRate = '1000'
        const tx: TransactionWithoutHash = await TransactionGenerator.generateTx(
          [bob.lockHash],
          [
            {
              address: bob.address,
              capacity: toShannon('500'),
            }
          ],
          bob.address,
          '0',
          feeRate
        )

        const inputCapacities = tx.inputs!
          .map(input => BigInt(input.capacity))
          .reduce((result, c) => result + c, BigInt(0))
        const outputCapacities = tx.outputs!
          .map(output => BigInt(output.capacity))
          .reduce((result, c) => result + c, BigInt(0))

        const expectedSize: number = TransactionSize.tx(tx) + TransactionSize.secpLockWitness()

        const expectedFee: bigint = TransactionFee.fee(expectedSize, BigInt(feeRate))
        expect(expectedFee).toEqual(BigInt(464))
        expect(inputCapacities - outputCapacities).toEqual(expectedFee)
        expect(tx.fee).toEqual(expectedFee.toString())
      })

      it('capacity 1000', async () => {
        const feeRate = '1000'
        const tx: TransactionWithoutHash = await TransactionGenerator.generateTx(
          [bob.lockHash],
          [
            {
              address: bob.address,
              capacity: toShannon('1000'),
            }
          ],
          bob.address,
          '0',
          feeRate
        )

        const inputCapacities = tx.inputs!
          .map(input => BigInt(input.capacity))
          .reduce((result, c) => result + c, BigInt(0))
        const outputCapacities = tx.outputs!
          .map(output => BigInt(output.capacity))
          .reduce((result, c) => result + c, BigInt(0))

        const expectedSize: number = TransactionSize.tx(tx) + TransactionSize.secpLockWitness() + TransactionSize.emptyWitness()
        const expectedFee: bigint = TransactionFee.fee(expectedSize, BigInt(feeRate))
        expect(inputCapacities - outputCapacities).toEqual(expectedFee)
        expect(tx.fee).toEqual(expectedFee.toString())
      })

      it('capacity 1000 - fee, no change output', async () => {
        const feeRate = '1000'
        const tx: TransactionWithoutHash = await TransactionGenerator.generateTx(
          [bob.lockHash],
          [
            {
              address: bob.address,
              capacity: BigInt(1000 * 10**8 - 355).toString(),
            }
          ],
          bob.address,
          '0',
          feeRate
        )

        const inputCapacities = tx.inputs!
          .map(input => BigInt(input.capacity))
          .reduce((result, c) => result + c, BigInt(0))
        const outputCapacities = tx.outputs!
          .map(output => BigInt(output.capacity))
          .reduce((result, c) => result + c, BigInt(0))

        const expectedSize: number = TransactionSize.tx(tx) + TransactionSize.secpLockWitness()
        const expectedFee: bigint = TransactionFee.fee(expectedSize, BigInt(feeRate))
        expect(expectedFee).toEqual(BigInt(355))
        expect(inputCapacities - outputCapacities).toEqual(expectedFee)
        expect(tx.fee).toEqual(expectedFee.toString())
      })

      it('capacity 1000 - fee + 1 shannon', async () => {
        const feeRate = '1000'
        const tx: TransactionWithoutHash = await TransactionGenerator.generateTx(
          [bob.lockHash],
          [
            {
              address: bob.address,
              capacity: (BigInt(1000 * 10**8) - BigInt(464) + BigInt(1)).toString(),
            }
          ],
          bob.address,
          '0',
          feeRate
        )

        const inputCapacities = tx.inputs!
          .map(input => BigInt(input.capacity))
          .reduce((result, c) => result + c, BigInt(0))
        const outputCapacities = tx.outputs!
          .map(output => BigInt(output.capacity))
          .reduce((result, c) => result + c, BigInt(0))

        const expectedSize: number = TransactionSize.tx(tx) + TransactionSize.secpLockWitness() + TransactionSize.emptyWitness()
        const expectedFee: bigint = TransactionFee.fee(expectedSize, BigInt(feeRate))
        expect(inputCapacities - outputCapacities).toEqual(expectedFee)
      })

      it(`2 bob's outputs, 1 alice output`, async () => {
        const aliceCell = generateCell(toShannon('1500'), OutputStatus.Live, false, null, alice)
        await getConnection().manager.save(aliceCell)

        const feeRate = '1000'
        const tx: TransactionWithoutHash = await TransactionGenerator.generateTx(
          [bob.lockHash, alice.lockHash],
          [
            {
              address: bob.address,
              capacity: BigInt(1000 * 10**8).toString(),
            },
            {
              address: alice.address,
              capacity: BigInt(2500 * 10**8).toString(),
            }
          ],
          bob.address,
          '0',
          feeRate
        )

        const expectedSize: number = TransactionSize.tx(tx) + TransactionSize.secpLockWitness() * 2 + TransactionSize.emptyWitness()
        const expectedFee: bigint = TransactionFee.fee(expectedSize, BigInt(feeRate))

        expect(tx.fee).toEqual(expectedFee.toString())
      })
    })

    describe('with fee 1000', () => {
      const fee = '1000'
      it('capacity 500', async () => {
        const tx: TransactionWithoutHash = await TransactionGenerator.generateTx(
          [bob.lockHash],
          [
            {
              address: bob.address,
              capacity: toShannon('500'),
            }
          ],
          bob.address,
          fee
        )

        const inputCapacities = tx.inputs!
          .map(input => BigInt(input.capacity))
          .reduce((result, c) => result + c, BigInt(0))
        const outputCapacities = tx.outputs!
          .map(output => BigInt(output.capacity))
          .reduce((result, c) => result + c, BigInt(0))

        expect(inputCapacities - outputCapacities).toEqual(BigInt(fee))
      })

      it('capacity 1000', async () => {
        const tx: TransactionWithoutHash = await TransactionGenerator.generateTx(
          [bob.lockHash],
          [
            {
              address: bob.address,
              capacity: toShannon('1000'),
            }
          ],
          bob.address,
          fee
        )

        const inputCapacities = tx.inputs!
          .map(input => BigInt(input.capacity))
          .reduce((result, c) => result + c, BigInt(0))
        const outputCapacities = tx.outputs!
          .map(output => BigInt(output.capacity))
          .reduce((result, c) => result + c, BigInt(0))

        expect(inputCapacities - outputCapacities).toEqual(BigInt(fee))
      })

      it('capacity 1000 - fee', async () => {
        const tx: TransactionWithoutHash = await TransactionGenerator.generateTx(
          [bob.lockHash],
          [
            {
              address: bob.address,
              capacity: (BigInt(1000 * 10**8) - BigInt(fee)).toString(),
            }
          ],
          bob.address,
          fee
        )

        const inputCapacities = tx.inputs!
          .map(input => BigInt(input.capacity))
          .reduce((result, c) => result + c, BigInt(0))
        const outputCapacities = tx.outputs!
          .map(output => BigInt(output.capacity))
          .reduce((result, c) => result + c, BigInt(0))

        expect(inputCapacities - outputCapacities).toEqual(BigInt(fee))
      })

      it('capacity 1000 - fee + 1 shannon', async () => {
        const tx: TransactionWithoutHash = await TransactionGenerator.generateTx(
          [bob.lockHash],
          [
            {
              address: bob.address,
              capacity: (BigInt(1000 * 10**8) - BigInt(fee) + BigInt(1)).toString(),
            }
          ],
          bob.address,
          fee
        )

        const inputCapacities = tx.inputs!
          .map(input => BigInt(input.capacity))
          .reduce((result, c) => result + c, BigInt(0))
        const outputCapacities = tx.outputs!
          .map(output => BigInt(output.capacity))
          .reduce((result, c) => result + c, BigInt(0))

        expect(inputCapacities - outputCapacities).toEqual(BigInt(fee))
      })
    })
  })

  describe('generateDepositAllTx', () => {
    beforeEach(async done => {
      const cells: OutputEntity[] = [
        generateCell(toShannon('1000'), OutputStatus.Live, false, null),
        generateCell(toShannon('2000'), OutputStatus.Live, false, null),
      ]
      await getConnection().manager.save(cells)
      done()
    })

    it('in fee mode, fee = 0', async () => {
      const tx = await TransactionGenerator.generateDepositAllTx(
        [bob.lockHash],
        bob.address,
        '0'
      )

      const expectCapacity = '300000000000'

      expect(tx.outputs!.length).toEqual(1)
      expect(tx.outputs![0].capacity).toEqual(expectCapacity)
    })

    it('in fee mode, fee = 999', async () => {
      const tx = await TransactionGenerator.generateDepositAllTx(
        [bob.lockHash],
        bob.address,
        '999'
      )

      const expectCapacity = BigInt('300000000000') - BigInt('999')

      expect(tx.outputs!.length).toEqual(1)
      expect(tx.outputs![0].capacity).toEqual(expectCapacity.toString())
    })

    it('in feeRate mode, feeRate = 0', async () => {
      const tx = await TransactionGenerator.generateDepositAllTx(
        [bob.lockHash],
        bob.address,
        '0',
        '0'
      )

      const expectCapacity = BigInt('300000000000')

      expect(tx.outputs!.length).toEqual(1)
      expect(tx.outputs![0].capacity).toEqual(expectCapacity.toString())
    })

    it('in feeRate mode, feeRate = 1000', async () => {
      const tx = await TransactionGenerator.generateDepositAllTx(
        [bob.lockHash],
        bob.address,
        '0',
        '1000'
      )

      const expectedFee = BigInt('590')
      const expectedCapacity = BigInt('300000000000') - expectedFee

      expect(tx.outputs!.length).toEqual(1)
      expect(tx.outputs![0].capacity).toEqual(expectedCapacity.toString())
      expect(tx.fee!).toEqual(expectedFee.toString())
    })
  })
})
