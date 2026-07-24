import { router } from 'expo-router';
import { AnimatedSplash } from '../components/splash/AnimatedSplash';

export default function Index() {
  const handleAnimationFinish = () => {
    router.replace('/(auth)/login');
  };

  return <AnimatedSplash onFinish={handleAnimationFinish} />;
}
