import {
  toast as sonnerToast,
  Toaster,
  type ExternalToast,
} from "sonner-original"

/** Success confirmations disabled — errors still surface via toast.error */
export const toast = {
  ...sonnerToast,
  success: (
    _message: Parameters<typeof sonnerToast.success>[0],
    _data?: ExternalToast
  ) => "" as ReturnType<typeof sonnerToast.success>,
}

export { Toaster }
