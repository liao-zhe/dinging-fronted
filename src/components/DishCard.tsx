import { View, Image, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './DishCard.scss';

interface Dish {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  tag?: string;
}

interface DishCardProps {
  dishes: Dish[];
}

export default function DishCard({ dishes }: DishCardProps) {
  if (!dishes || dishes.length === 0) {
    return null;
  }

  const handleDishClick = (dish: Dish) => {
    // 跳转到首页，可以考虑后续跳转到菜品详情
    Taro.switchTab({
      url: '/pages/home/index',
    });
  };

  return (
    <View className='dish-cards'>
      <View className='dish-cards__header'>
        <Text className='dish-cards__title'>🍳 推荐菜品</Text>
      </View>
      <ScrollView
        className='dish-cards__scroll'
        scrollX
        scrollWithAnimation
        enhanced
        showScrollbar={false}
      >
        {dishes.map((dish) => (
          <View
            key={dish.id}
            className='dish-card'
            onClick={() => handleDishClick(dish)}
          >
            {dish.image_url ? (
              <Image
                className='dish-card__image'
                src={dish.image_url}
                mode='aspectFill'
              />
            ) : (
              <View className='dish-card__image dish-card__image--placeholder'>
                <Text className='dish-card__placeholder-text'>暂无图片</Text>
              </View>
            )}
            <View className='dish-card__info'>
              <Text className='dish-card__name'>{dish.name}</Text>
              {dish.category && (
                <Text className='dish-card__category'>{dish.category}</Text>
              )}
              {dish.description && (
                <Text className='dish-card__desc'>{dish.description}</Text>
              )}
              <View className='dish-card__bottom'>
                {dish.price !== undefined && (
                  <Text className='dish-card__price'>¥{dish.price}</Text>
                )}
                {dish.tag && (
                  <View className='dish-card__tag'>
                    <Text className='dish-card__tag-text'>{dish.tag}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
