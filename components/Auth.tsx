import { Fragment, useEffect, useRef, useState } from 'react'
import { useWallet, useWalletList } from '@meshsdk/react'
import { toast } from 'react-hot-toast'
import { PhotoIcon, UserIcon, WalletIcon } from '@heroicons/react/24/solid'
import { useAuth } from '@/contexts/AuthContext'
import setUser from '@/functions/storage/users/setUser'
import Modal from './Modal'
import LinkList from './LinkList'
import TokenExplorer from './TokenExplorer'
import TextFrown from './TextFrown'
import { Address, StakeKey } from '@/@types'
import { LS_KEYS } from '@/constants'

const Auth = () => {
  const installedWallets = useWalletList()
  const { connect, disconnect, connecting, connected, name, error } = useWallet()
  const { user, getAndSetUser, openConnectModal, toggleConnectModal } = useAuth()

  const mountRef = useRef(false)

  useEffect(() => {
    if (!mountRef.current) {
      mountRef.current = true

      const lsValue = localStorage.getItem(LS_KEYS['WALLET_PROVIDER'])
      if (lsValue) connect(lsValue)
    } else {
      if (connected) {
        localStorage.setItem(LS_KEYS['WALLET_PROVIDER'], name)
        toggleConnectModal(false)
      } else {
        localStorage.removeItem(LS_KEYS['WALLET_PROVIDER'])
      }
    }
  }, [connected, name])

  const [openProfileModal, setOpenProfileModal] = useState(false)
  const toggleProfileModal = (bool?: boolean) => setOpenProfileModal((prev) => bool ?? !prev)

  const [openProfilePictureModal, setOpenProfilePictureModal] = useState(false)
  const toggleProfilePictureModal = (bool?: boolean) => setOpenProfilePictureModal((prev) => bool ?? !prev)

  const [username, setUsername] = useState('')
  const [profilePicture, setProfilePicture] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setProfilePicture(user.profilePicture || '')
    }
  }, [user])

  const handleSaveUser = async () => {
    toast.loading('Saving Profile')
    setLoading(true)

    try {
      await setUser({
        stakeKey: user?.stakeKey as StakeKey,
        addresses: user?.addresses as Address[],
        username,
        profilePicture,
      })

      toast.dismiss()
      toast.success('Profile Saved')

      await getAndSetUser()

      setLoading(false)
      toggleProfileModal(false)
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message)

      setLoading(false)
    }
  }

  return (
    <Fragment>
      {connected ? (
        <div className='group relative p-1 flex items-center cursor-pointer'>
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt='' width={50} height={50} className='rounded-full' />
          ) : (
            <div className='p-2 rounded-full bg-gradient-to-b from-purple-500 via-blue-500 to-green-500'>
              <UserIcon className='w-8 h-8' />
            </div>
          )}

          {user ? (
            <div className='w-60 p-0.5 rounded-lg bg-gradient-to-b from-purple-500 via-blue-500 to-green-500 hidden group-hover:block absolute top-[100%] right-0'>
              <div className='p-2 rounded-lg bg-zinc-800'>
                <LinkList
                  items={[
                    {
                      label: 'Profile',
                      Icon: (props) => <UserIcon {...props} />,
                      onClick: () => toggleProfileModal(true),
                    },
                    {
                      label: 'Switch Wallet',
                      Icon: (props) => <WalletIcon {...props} />,
                      onClick: () => toggleConnectModal(true),
                    },
                  ]}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className='p-0.5 rounded-lg bg-gradient-to-b from-purple-500 via-blue-500 to-green-500'>
          <button
            onClick={() => toggleConnectModal(true)}
            disabled={openConnectModal}
            className='py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700'
          >
            Connect
          </button>
        </div>
      )}

      <Modal open={openConnectModal} onClose={() => toggleConnectModal(false)}>
        {!installedWallets.length ? (
          <TextFrown text='No wallets installed...' className='mt-[50%]' />
        ) : (
          <div className='max-w-[1024px] mx-auto text-center'>
            <h2 className='text-lg'>Connect Wallet</h2>

            {/* @ts-ignore */}
            {error ? <p className='text-red-400'>{error?.message || error?.toString()}</p> : null}

            {installedWallets.map(({ name, icon }) => (
              <button
                key={name}
                onClick={() => connect(name)}
                disabled={connected || connecting}
                className='w-full max-w-[420px] my-2 mx-auto p-2 flex items-center justify-between rounded-lg bg-zinc-700 bg-opacity-70 hover:bg-zinc-600 hover:bg-opacity-70 disabled:opacity-40'
              >
                <img src={icon} alt='' width={42} height={42} className='drop-shadow-[0_0_1px_rgba(0,0,0,1)]' />
                {name}
              </button>
            ))}

            {connected ? (
              <button
                onClick={() => {
                  disconnect()
                  toast.success('Disconnected')
                }}
                disabled={!connected || connecting}
                className='w-full max-w-[420px] my-2 mx-auto p-4 flex items-center justify-center rounded-lg bg-zinc-700 bg-opacity-70 hover:bg-zinc-600 hover:bg-opacity-70 disabled:opacity-40'
              >
                Disconnect
              </button>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal open={openProfileModal} onClose={() => toggleProfileModal(false)}>
        <div className='h-[95vh] sm:h-[70vh] max-w-[350px] mx-auto flex flex-col justify-between'>
          <div className='flex flex-col items-center'>
            <button
              onClick={() => {
                toggleProfilePictureModal(true)
                toggleProfileModal(false)
              }}
              disabled={loading}
              className='w-64 h-64 text-sm text-gray-400 hover:text-white rounded-full bg-zinc-700 bg-opacity-70 hover:bg-zinc-600 hover:bg-opacity-70'
            >
              {profilePicture ? (
                <img src={profilePicture} alt='' className='w-full rounded-full' />
              ) : (
                <Fragment>
                  <PhotoIcon className='w-12 h-12 mx-auto' />
                  <p>Profile Picture</p>
                </Fragment>
              )}
            </button>

            <input
              placeholder='Username:'
              value={username}
              onChange={(e) => setUsername(e.target.value.replaceAll(' ', ''))}
              disabled={loading}
              className='w-full mt-2 p-4 flex items-center text-center placeholder:text-gray-400 hover:placeholder:text-white rounded-lg bg-zinc-700 bg-opacity-70 hover:bg-zinc-600 hover:bg-opacity-70 disabled:bg-zinc-800 outline-none'
            />
          </div>

          <div className='w-full rounded-lg bg-gradient-to-b from-purple-500 via-blue-500 to-green-500'>
            <button
              onClick={handleSaveUser}
              disabled={loading || (username === user?.username && profilePicture === user?.profilePicture)}
              className='w-full p-4 flex items-center justify-center rounded-lg bg-opacity-50 hover:bg-opacity-50 bg-zinc-700 hover:bg-zinc-500 disabled:bg-zinc-800 disabled:text-zinc-600'
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={openProfilePictureModal} onClose={() => toggleProfilePictureModal(false)}>
        <TokenExplorer
          onlyNonFungible
          callback={(payload) => {
            setProfilePicture(payload.image.url)
            toggleProfilePictureModal(false)
            toggleProfileModal(true)
          }}
        />
      </Modal>
    </Fragment>
  )
}

export default Auth