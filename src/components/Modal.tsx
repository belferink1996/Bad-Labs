import type { PropsWithChildren } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useWallet } from '@meshsdk/react';
import { useAuth } from '@/contexts/AuthContext';
import Loader from './Loader';
import ErrorNotConnected from './journeys/steps/ErrorNotConnected';
import ErrorNotTokenGateHolder from './journeys/steps/ErrorNotTokenGateHolder';

const Modal = (props: PropsWithChildren<{ open: boolean; onClose: () => void; withConnected?: boolean; withTokenGate?: boolean }>) => {
  const { children, open, onClose, withConnected, withTokenGate } = props;
  const { connected } = useWallet();
  const { user } = useAuth();

  return (
    <div
      className={
        (open ? 'block' : 'hidden') +
        ' w-screen h-screen flex items-center justify-center fixed top-0 left-0 z-50 bg-black bg-opacity-50 backdrop-blur-lg'
      }
    >
      {open ? (
        <section className='relative bg-gradient-to-b from-purple-500 via-blue-500 to-green-500 p-0.5 rounded-xl'>
          <div className='overflow-y-auto w-screen h-screen sm:min-w-[42vw] sm:max-w-[90vw] sm:min-h-[69vh] sm:max-h-[90vh] sm:w-fit sm:h-fit p-8 sm:rounded-xl bg-zinc-800'>
            <button className='w-6 h-6 rounded-full absolute top-2 right-4 z-10' onClick={onClose}>
              <XMarkIcon className='w-8 h-8 animate-pulse hover:animate-spin' />
            </button>

            {(withConnected || withTokenGate) && !connected ? (
              <ErrorNotConnected onClose={onClose} />
            ) : (withConnected || withTokenGate) && !user ? (
              <Loader />
            ) : withTokenGate && !user?.isTokenGateHolder ? (
              <ErrorNotTokenGateHolder />
            ) : (
              children
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default Modal;
