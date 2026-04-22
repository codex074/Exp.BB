import Swal from 'sweetalert2'

export const swalTheme = {
  popup: 'rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl bg-white/95 backdrop-blur-xl',
  title: 'text-slate-800 text-2xl font-bold mb-1',
  htmlContainer: 'text-slate-500 text-base',
  confirmButton: 'btn-donate min-w-[130px] justify-center shadow-lg border-0 text-white',
  cancelButton:
    'px-6 py-3 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 transition-all bg-white',
  actions: 'flex gap-4 justify-center w-full items-center mt-4',
  input:
    'w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-base text-slate-600',
}

export const MySwal = Swal.mixin({
  customClass: swalTheme,
  buttonsStyling: false,
  confirmButtonText: 'ตกลง',
})

export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  },
})
