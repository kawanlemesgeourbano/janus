"""Windows protection for publisher signing keys; no key is stored in this module."""
import ctypes,os
class Blob(ctypes.Structure):
    _fields_=[('length',ctypes.c_uint32),('data',ctypes.POINTER(ctypes.c_ubyte))]
def dpapi(data,encrypt):
    if os.name!='nt':raise RuntimeError('The publishing key uses Windows DPAPI')
    buffer=(ctypes.c_ubyte*len(data)).from_buffer_copy(data)
    source=Blob(len(data),buffer);target=Blob();crypto=ctypes.WinDLL('crypt32',use_last_error=True)
    if encrypt:ok=crypto.CryptProtectData(ctypes.byref(source),None,None,None,None,1,ctypes.byref(target))
    else:ok=crypto.CryptUnprotectData(ctypes.byref(source),None,None,None,None,1,ctypes.byref(target))
    if not ok:raise ctypes.WinError(ctypes.get_last_error())
    try:return ctypes.string_at(target.data,target.length)
    finally:
        kernel=ctypes.WinDLL('kernel32');kernel.LocalFree.argtypes=[ctypes.c_void_p];kernel.LocalFree(target.data)
