LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE    := security_checks
LOCAL_SRC_FILES := ../cpp/RootChecks.cpp ../cpp/FridaChecks.cpp ../cpp/SecurityNative.cpp ../cpp/MemoryProtection.cpp
LOCAL_LDLIBS    := -llog -landroid
include $(BUILD_SHARED_LIBRARY)
