import Swal from 'sweetalert2';

// Toast configuration
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

// Success toast
export const showSuccessToast = (message: string) => {
  Toast.fire({
    icon: 'success',
    title: message
  });
};

// Error toast
export const showErrorToast = (message: string) => {
  Toast.fire({
    icon: 'error',
    title: message
  });
};

// Info toast
export const showInfoToast = (message: string) => {
  Toast.fire({
    icon: 'info',
    title: message
  });
};

// Warning toast
export const showWarningToast = (message: string) => {
  Toast.fire({
    icon: 'warning',
    title: message
  });
};

// Success alert (requires user action)
export const showSuccess = async (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#2563eb',
  });
};

// Error alert (requires user action)
export const showError = async (title: string, text?: string) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#dc2626',
  });
};

// Info alert (requires user action)
export const showInfo = async (title: string, text?: string) => {
  return Swal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#2563eb',
  });
};

// Confirmation dialog
export const showConfirm = async (
  title: string,
  text?: string,
  confirmText = 'Sim',
  cancelText = 'Cancelar',
  isDanger = false
): Promise<boolean> => {
  const result = await Swal.fire({
    icon: isDanger ? 'warning' : 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: isDanger ? '#dc2626' : '#2563eb',
    cancelButtonColor: '#6b7280',
  });
  return result.isConfirmed;
};

// Delete confirmation (pre-configured for delete actions)
export const showDeleteConfirm = async (itemName: string): Promise<boolean> => {
  return showConfirm(
    'Confirmar Exclusão',
    `Tem certeza que deseja excluir ${itemName}? Esta ação não pode ser desfeita.`,
    'Sim, Excluir',
    'Cancelar',
    true
  );
};

// Export Swal for custom usage
export { Swal };
