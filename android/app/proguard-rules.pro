# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Keep JNI methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep ALL security classes - R8 must NOT rename or strip any of these
# because they are accessed via JNI (FindClass) and React Native reflection
-keep class com.learningapp.security.** { *; }

# Keep Play Integrity
-keep class com.google.android.play.core.integrity.** { *; }
-keep class com.google.android.gms.** { *; }

# Keep RootBeer
-keep class com.scottyab.rootbeer.** { *; }

# React Native rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.fbreact.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.systrace.** { *; }

# Keep the MainApplication class
-keep class com.learningapp.MainApplication { *; }
-keep class com.learningapp.MainActivity { *; }

# Keep BuildConfig
-keep class com.learningapp.BuildConfig { *; }

# Don't warn about missing optional dependencies
-dontwarn com.google.android.play.core.**
-dontwarn com.scottyab.rootbeer.**
