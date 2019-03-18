import { ipcMain, Notification, BrowserWindow } from 'electron'

import { Channel } from '../utils/const'
import { transactions, transactionCount, wallets, Wallet } from '../mock'
import asw from '../wallets/asw'
import ckbCore from '../core'

enum ResponseStatus {
  Fail,
  Success,
}

const NOTIFICATION_FADE_TIME = 3000

export class Listeners {
  static start = (
    methods: string[] = [
      'getLiveCell',
      'createWallet',
      'deleteWallet',
      'importWallet',
      'exportWallet',
      'switchWallet',
      'getBalance',
      'getCellsByTypeHash',
      'asw',
      'getUnspentCells',
      'getTransactions',
      'getWallets',
      'checkWalletPassword',
      'sendCapacity',
      'sendTransaction',
      'sign',
      'setNetwork',
    ],
  ) => {
    methods.forEach(method => {
      const descriptor = Object.getOwnPropertyDescriptor(Listeners, method)
      if (descriptor) {
        descriptor.value()
      }
    })
  }

  /**
   * @static getLiveCell
   * @memberof ChannelListeners
   * @description listen to get live cell channel
   */
  static getLiveCell = () => {
    return ipcMain.on(Channel.GetLiveCell, (e: Electron.Event, ...args: string[]) => {
      e.sender.send(Channel.GetLiveCell, args)
    })
  }

  // wallet
  /**
   * @static createWallet
   * @memberof ChannelListeners
   * @description channel to create wallet
   */
  static createWallet = () => {
    return ipcMain.on(Channel.CreateWallet, (e: Electron.Event, wallet: Wallet) => {
      const notification = new Notification({
        title: 'Create Wallet',
        body: JSON.stringify(wallet),
      })
      notification.show()
      setTimeout(notification.close, NOTIFICATION_FADE_TIME)
      e.sender.send(Channel.CreateWallet, {
        status: ResponseStatus.Success,
        result: {
          name: wallet.name,
          address: 'wallet address',
          publicKey: 'public key',
        },
      })
    })
  }

  /**
   * @static deleteWallet
   * @memberof ChannelListeners
   * @description channel to delete wallet
   */
  static deleteWallet = () => {
    return ipcMain.on(Channel.DeleteWallet, (e: Electron.Event, address: string) => {
      const notification = new Notification({
        title: 'Delete Wallet',
        body: address,
      })
      notification.show()
      setTimeout(notification.close, NOTIFICATION_FADE_TIME)
      e.sender.send(Channel.DeleteWallet, {
        status: ResponseStatus.Success,
        reult: `wallet of ${address} deleted`,
      })
    })
  }

  /**
   * @static importWallet
   * @memberof ChannelListeners
   * @description channel to import a wallet
   */
  static importWallet = () => {
    return ipcMain.on(Channel.ImportWallet, (e: Electron.Event, wallet: Wallet) => {
      const notification = new Notification({
        title: 'Import Wallet',
        body: JSON.stringify(wallet),
      })
      notification.show()
      setTimeout(notification.close, NOTIFICATION_FADE_TIME)
      e.sender.send(Channel.ImportWallet, {
        status: ResponseStatus.Success,
        result: `wallet imported`,
      })
    })
  }

  /**
   * @static exportWallet
   * @memberof ChannelListeners
   * @description channel to export wallet
   */
  static exportWallet = () => {
    return ipcMain.on(Channel.ExportWallet, (e: Electron.Event) => {
      const notification = new Notification({
        title: 'Export Wallet',
        body: '',
      })
      notification.show()
      setTimeout(notification.close, NOTIFICATION_FADE_TIME)
      e.sender.send(Channel.ExportWallet, {
        status: ResponseStatus.Success,
        result: `wallet exported`,
      })
    })
  }

  /**
   * @static switchWallet
   * @memberof ChannelListeners
   * @description channel to switch wallet
   */
  static switchWallet = () => {
    return ipcMain.on(Channel.SwitchWallet, (e: Electron.Event, wallet: Wallet) => {
      e.sender.send(Channel.SwitchWallet, {
        status: ResponseStatus.Success,
        result: wallet.name,
      })
    })
  }

  /**
   * @static getBalance
   * @memberof ChannelListeners
   * @description channel to get balance
   */
  static getBalance = () => {
    return ipcMain.on(Channel.GetBalance, (e: Electron.Event) => {
      e.sender.send(Channel.GetBalance, {
        status: ResponseStatus.Success,
        result: `balance`,
      })
    })
  }

  /**
   * @static getCellsByTypeHash
   * @memberof ChannelListeners
   * @description channel to get cells by type hash
   */
  static getCellsByTypeHash = () => {
    return ipcMain.on(Channel.GetCellsByTypeHash, (e: Electron.Event) => {
      e.sender.send(Channel.GetCellsByTypeHash, {
        status: ResponseStatus.Success,
        result: [`cell`],
      })
    })
  }

  /**
   * @static asw
   * @memberof ChannelListeners
   * @description channel to get asw
   */
  static asw = () => {
    return ipcMain.on(`ASW`, (e: Electron.Event) => {
      e.sender.send(`ASW`, {
        status: ResponseStatus.Success,
        result: asw,
      })
    })
  }

  /**
   * @static getUnspentCells
   * @memberof ChannelListeners
   * @description channel to get unspent cells
   */
  static getUnspentCells = () => {
    return ipcMain.on(Channel.GetUnspentCells, (e: Electron.Event) => {
      e.sender.send(Channel.GetUnspentCells, {
        status: ResponseStatus.Success,
        result: [`cell`],
      })
    })
  }

  /**
   * @static getTransactions
   * @memberof ChannelListeners
   * @description get transactions
   */
  static getTransactions = () => {
    return ipcMain.on(
      Channel.GetTransactions,
      (e: Electron.Event, { pageNo, pageSize }: { pageNo: number; pageSize: number }) => {
        e.sender.send(Channel.GetTransactions, {
          status: ResponseStatus.Success,
          result: {
            pageNo,
            pageSize,
            totalCount: transactionCount,
            items: transactions.map(tx => ({
              ...tx,
              value: tx.value * pageNo * pageSize,
            })),
          },
        })
      },
    )
  }

  /**
   * @static getWallets
   * @memberof ChannelListeners
   * @description channel to get wallets
   */
  static getWallets = () => {
    return ipcMain.on(Channel.GetWallets, (e: Electron.Event) => {
      e.sender.send(Channel.GetWallets, {
        status: ResponseStatus.Success,
        result: wallets(),
      })
    })
  }

  /**
   * @static getWallets
   * @memberof ChannelListeners
   * @description channel to get wallets
   */
  static checkWalletPassword = () => {
    return ipcMain.on(
      Channel.CheckWalletPassword,
      (e: Electron.Event, { walletID, password }: { walletID: string; password: string }) => {
        let valid = false
        wallets().forEach((value: Wallet) => {
          if (value.id === walletID && value.password === password) {
            valid = true
          }
        })
        e.sender.send(Channel.CheckWalletPassword, {
          status: ResponseStatus.Success,
          result: valid,
        })
      },
    )
  }

  /**
   * @static sendCapacity
   * @memberof ChannelListeners
   * @description channel to send capacity
   */
  static sendCapacity = () => {
    return ipcMain.on(
      Channel.SendCapacity,
      (e: Electron.Event, { address, capacity }: { address: string; capacity: number }) => {
        const notification = new Notification({
          title: `Send Capacity`,
          body: `Send Capacity to CKB with ${JSON.stringify(
            {
              address,
              capacity,
            },
            null,
            2,
          )}`,
        })
        notification.show()
        e.sender.send(Channel.SendCapacity, {
          status: ResponseStatus.Success,
          msg: `Send ${capacity} Capacity to ${address} Successfully`,
        })
      },
    )
  }

  /**
   * @static sendTransaction
   * @memberof ChannelListeners
   * @description channel to send transaction
   */
  static sendTransaction = () => {
    return ipcMain.on(Channel.SendTransaction, (e: Electron.Event) => {
      const notification = new Notification({
        title: `Send Transaction`,
        body: `transaction detail`,
      })
      notification.show()
      e.sender.send(Channel.SendTransaction, {
        status: ResponseStatus.Success,
        result: {
          hash: 'transaction hash',
        },
      })
    })
  }

  /**
   * @static sign
   * @memberof ChannelListeners
   * @description channel to sign msg
   */
  static sign = () => {
    return ipcMain.on(Channel.Sign, (e: Electron.Event) => {
      e.sender.send(Channel.Sign, {
        status: ResponseStatus.Success,
        result: `signed msg`,
      })
    })
  }

  /**
   * @static setNetwork
   * @memberof ChannelListeners
   * @description channel to set network
   */
  static setNetwork = () => {
    return ipcMain.on(Channel.SetNetwork, (e: Electron.Event, network: { name: string; remote: string }) => {
      // TODO:
      ckbCore.setNode({
        url: network.remote,
      })
      Object.defineProperty(ckbCore.node, 'name', {
        value: network.name,
      })
      e.sender.send(Channel.GetNetwork, {
        status: ResponseStatus.Success,
        result: {
          ...network,
          connected: false,
        },
      })
    })
  }
}

export const sendTransactionHistory = (win: Electron.BrowserWindow, pageNo: number, pageSize: number) => {
  win.webContents.send(Channel.GetTransactions, {
    status: ResponseStatus.Success,
    result: {
      pageNo,
      pageSize,
      totalCount: transactionCount,
      items: transactions.map(tx => ({
        ...tx,
        value: tx.value * pageNo * pageSize,
      })),
    },
  })
}

export default class WalletChannel extends Listeners {
  public win: BrowserWindow

  constructor(window: BrowserWindow) {
    super()
    this.win = window
  }

  public sendWallet = (
    wallet: any = {
      name: 'asw',
      address: asw.address,
      publicKey: asw.publicKey,
    },
  ) => {
    this.win.webContents.send(Channel.GetWallet, {
      status: ResponseStatus.Success,
      result: wallet,
    })
  }

  public setUILocale = (locale: string) => {
    this.win.webContents.send(Channel.SetLanguage, {
      status: ResponseStatus.Success,
      result: locale,
    })
  }

  public navTo = (route: string) => {
    this.win.webContents.send(Channel.NavTo, {
      status: ResponseStatus.Success,
      result: {
        router: route,
      },
    })
  }

  public sendTransactionHistory = (pageNo: number, pageSize: number) => {
    this.win.webContents.send(Channel.GetTransactions, {
      status: ResponseStatus.Success,
      result: {
        pageNo,
        pageSize,
        totalCount: transactionCount,
        items: transactions.map(tx => ({
          ...tx,
          value: tx.value * pageNo * pageSize,
        })),
      },
    })
  }
}
// TOOD: replace with response status
