import {
  deposit,
  mint,
  approve,
  redeem,
  borrow,
  repay,
  setUseAsCollateral,
  swapBorrowRateMode,
  rebalanceStableBorrowRate,
  allowInterestRedirectionTo,
  redirectInterestStream,
  redirectInterestStreamOf,
} from '../actions';
import {on} from 'cluster';
import {RATEMODE_STABLE, RATEMODE_NONE, RATEMODE_VARIABLE} from '../../utils/constants';

export interface Action {
  name: string;
  args?: any;
  expected: string;
  revertMessage?: string;
}

export interface Story {
  description: string;
  actions: Action[];
}

export interface Scenario {
  title: string;
  description: string;
  stories: Story[];
}

export const executeStory = async (story: Story, users: string[]) => {
  for (const action of story.actions) {
    await executeAction(action, users);
  }
};

const executeAction = async (action: Action, users: string[]) => {
  const {reserve, user} = action.args;
  const {name, expected, revertMessage} = action;

  if (!name || name === '') {
    throw 'Action name is missing';
  }
  if (!reserve || reserve === '') {
    throw 'Invalid reserve selected for deposit';
  }
  if (!user || user === '') {
    throw `Invalid user selected to deposit into the ${reserve} reserve`;
  }

  if (!expected || expected === '') {
    throw `An expected resut for action ${name} is required`;
  }

  const userAddress = users[parseInt(user)];

  switch (name) {
    case 'mint':
      const {amount} = action.args;

      if (!amount || amount === '') {
        throw `Invalid amount of ${reserve} to mint`;
      }

      await mint(reserve, amount, userAddress);
      break;

    case 'approve':
      await approve(reserve, userAddress);
      break;

    case 'deposit':
      {
        const {amount, sendValue} = action.args;

        if (!amount || amount === '') {
          throw `Invalid amount to deposit into the ${reserve} reserve`;
        }

        await deposit(reserve, amount, userAddress, sendValue, expected, revertMessage);
      }
      break;

    case 'redeem':
      {
        const {amount} = action.args;

        if (!amount || amount === '') {
          throw `Invalid amount to redeem from the ${reserve} reserve`;
        }

        await redeem(reserve, amount, userAddress, expected, revertMessage);
      }
      break;
    case 'borrow':
      {
        const {amount, borrowRateMode, timeTravel} = action.args;

        if (!amount || amount === '') {
          throw `Invalid amount to borrow from the ${reserve} reserve`;
        }

        let rateMode: string = RATEMODE_NONE;

        if (borrowRateMode === 'none') {
          RATEMODE_NONE;
        } else if (borrowRateMode === 'stable') {
          rateMode = RATEMODE_STABLE;
        } else if (borrowRateMode === 'variable') {
          rateMode = RATEMODE_VARIABLE;
        } else {
          //random value, to test improper selection of the parameter
          rateMode = '4';
        }

        await borrow(reserve, amount, rateMode, userAddress, timeTravel, expected, revertMessage);
      }
      break;

    case 'repay':
      {
        const {amount, sendValue} = action.args;
        let {onBehalfOf} = action.args;

        if (!amount || amount === '') {
          throw `Invalid amount to repay into the ${reserve} reserve`;
        }

        if (!onBehalfOf || onBehalfOf === '') {
          console.log(
            'WARNING: No onBehalfOf specified for a repay action. Defaulting to the repayer address'
          );
          onBehalfOf = userAddress;
        } else {
          onBehalfOf = users[parseInt(onBehalfOf)];
        }

        await repay(reserve, amount, userAddress, onBehalfOf, sendValue, expected, revertMessage);
      }
      break;

    case 'setUseAsCollateral':
      {
        const {useAsCollateral} = action.args;

        if (!useAsCollateral || useAsCollateral === '') {
          throw `A valid value for useAsCollateral needs to be set when calling setUseReserveAsCollateral on reserve ${reserve}`;
        }
        await setUseAsCollateral(reserve, userAddress, useAsCollateral, expected, revertMessage);
      }
      break;

    case 'swapBorrowRateMode':
      await swapBorrowRateMode(reserve, userAddress, expected, revertMessage);
      break;

    case 'rebalanceStableBorrowRate':
      {
        const {target} = action.args;

        if (!target || target === '') {
          throw `A target must be selected when trying to rebalance a stable rate`;
        }
        const targetAddress = users[parseInt(target)];

        await rebalanceStableBorrowRate(
          reserve,
          userAddress,
          targetAddress,
          expected,
          revertMessage
        );
      }
      break;

    case 'redirectInterestStream':
      {
        const {to} = action.args;

        if (!to || to === '') {
          throw `A target must be selected when trying to redirect the interest`;
        }
        const toAddress = users[parseInt(to)];

        await redirectInterestStream(reserve, userAddress, toAddress, expected, revertMessage);
      }
      break;

    case 'redirectInterestStreamOf':
      {
        const {from, to} = action.args;

        if (!from || from === '') {
          throw `A from address must be specified when trying to redirect the interest`;
        }
        if (!to || to === '') {
          throw `A target must be selected when trying to redirect the interest`;
        }
        const toAddress = users[parseInt(to)];
        const fromAddress = users[parseInt(from)];

        await redirectInterestStreamOf(
          reserve,
          userAddress,
          fromAddress,
          toAddress,
          expected,
          revertMessage
        );
      }
      break;

    case 'allowInterestRedirectionTo':
      {
        const {to} = action.args;

        if (!to || to === '') {
          throw `A target must be selected when trying to redirect the interest`;
        }
        const toAddress = users[parseInt(to)];

        await allowInterestRedirectionTo(reserve, userAddress, toAddress, expected, revertMessage);
      }
      break;
    default:
      throw `Invalid action requested: ${name}`;
  }
};
