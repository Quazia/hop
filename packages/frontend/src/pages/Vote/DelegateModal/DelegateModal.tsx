import React, { FC, useState } from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Modal from 'src/components/modal/Modal'
import Button from 'src/components/buttons/Button'
import Box from '@material-ui/core/Box'
import LargeTextField from 'src/components/LargeTextField'
import Typography from '@material-ui/core/Typography'
import { useWeb3Context } from 'src/contexts/Web3Context'
import Address from 'src/models/Address'
import DelegateModalTransaction from 'src/pages/Vote/DelegateModal/DelegateModalTransaction'
import { Contract } from 'ethers'

const useStyles = makeStyles(() => ({
  modalContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  textContainer: {
    marginTop: '1rem',
    marginBottom: '1rem'
  },
  actionContainer: {
    display: 'flex',
    alignSelf: 'center',
    margin: '1rem'
  },
  selfDelegateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  textFieldContainer: {
    alignSelf: 'center'
  }
}))

type DelegateModalProps = {
  isOpen: boolean
  onClose: () => void
  numVotes: string
  l1Hop: Contract | undefined
}

const DelegateModal: FC<DelegateModalProps> = props => {
  const { isOpen, onClose, numVotes, l1Hop } = props
  const styles = useStyles()
  const { address: userAddress } = useWeb3Context()
  const [isSelfDelegate, setIsSelfDelegate] = useState(false)
  const [isOtherDelegate, setIsOtherDelegate] = useState(false)
  const [delegateAddress, setDelegateAddress] = useState<Address | undefined>()

  const selfOrOtherText = isOtherDelegate ? '' : 'to Self'

  function handleOnClose () {
    setIsSelfDelegate(false)
    setIsOtherDelegate(false)
    onClose()
  }

  function handleDelegateClick() {
    setIsSelfDelegate(true)
    setIsOtherDelegate(false)
    handleApprove()
  }

  function handleOtherDelegateClick () {
    setIsSelfDelegate(false)
    setIsOtherDelegate(true)
  }

  const handleAddressInput = async (event: any) => {
    try {
      const value = event.target.value || ''
      const _address = new Address(value)
      setDelegateAddress(_address)
    } catch (err) {}
  }

  // TODO: use `setTransactions()` to add to tx pill
  const handleApprove = async () => {
    const _delegateAddress = delegateAddress || userAddress
    await l1Hop?.delegate(_delegateAddress?.toString())
  }

  return (
    <>
      {isOpen && (
        <Modal onClose={handleOnClose}>
          {!isSelfDelegate && (
            <Box
              display="flex"
              alignItems="center"
              className={styles.modalContainer}
            >
              <Typography variant="h6">Participating Pools</Typography>
              <Typography variant="body1" className={styles.textContainer}>
                Earned HOP tokens represent voting shares in Hop governance.
              </Typography>
              <Typography variant="body1" className={styles.textContainer}>
                You can either vote on each proposal yourself or delegate your
                votes to a third party.
              </Typography>
              {isOtherDelegate &&
                <LargeTextField
                  onChange={handleAddressInput}
                  centerAlign
                  defaultShadow
                  autoFocus
                  placeholder="Wallet Address"
                  className={styles.textFieldContainer}
                />
              }
              <Box display="flex" alignItems="center" className={styles.actionContainer}>
                <Button
                  highlighted
                  disabled={isOtherDelegate && !delegateAddress}
                  onClick={handleDelegateClick}
                >
                  Delegate Votes {`${selfOrOtherText}`}
                </Button>
                {!isOtherDelegate && (
                  <Button
                    highlighted
                    onClick={handleOtherDelegateClick}
                  >
                    Add Delegate
                  </Button>
                )}
              </Box>
            </Box>
          )}
          {
            isSelfDelegate && <DelegateModalTransaction numVotes={numVotes} />
          }
        </Modal>
      )}
    </>
  )
}

export default DelegateModal
