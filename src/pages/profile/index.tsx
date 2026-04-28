import { Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import type { CSSProperties } from 'react'
import { useMemo, useRef, useState } from 'react'

import { GlobalAssistant } from '../../components/global-assistant'
import { PageShell } from '../../components/page-shell'
import { getCategories, type Category } from '../../services/dish'
import {
  createManagedDish,
  deleteManagedDish,
  getManagedDishes,
  updateManagedDish,
  type ManagedDish
} from '../../services/managed-dish'
import { uploadImage } from '../../services/upload'
import { checkAuth, logout } from '../../services/user'
import { getUser, hasToken } from '../../utils/session'
import { getCompatibleSystemInfoSync } from '../../utils/system-info'

import './index.scss'

type ModalMode = 'create' | 'edit'

interface DishFormState {
  name: string
  description: string
  categoryId: string
  localImagePath: string
  remoteImageUrl: string
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

function createEmptyForm(categoryId = ''): DishFormState {
  return {
    name: '',
    description: '',
    categoryId,
    localImagePath: '',
    remoteImageUrl: ''
  }
}

function getModalMaskStyle(): CSSProperties {
  const systemInfo = getCompatibleSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 20
  const windowHeight = systemInfo.windowHeight || 667
  const safeAreaBottom =
    (systemInfo as { safeArea?: { bottom?: number } }).safeArea?.bottom ||
    windowHeight
  const bottomInset = Math.max(windowHeight - safeAreaBottom, 0)

  try {
    const menuButton = Taro.getMenuButtonBoundingClientRect()
    const gap = Math.max(menuButton.top - statusBarHeight, 8)

    return {
      paddingTop: `${menuButton.bottom + gap + 16}px`,
      paddingBottom: `${bottomInset + 20}px`
    }
  } catch {
    return {
      paddingTop: `${statusBarHeight + 92}px`,
      paddingBottom: `${bottomInset + 20}px`
    }
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export default function ProfilePage() {
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [editingDishId, setEditingDishId] = useState('')
  const [form, setForm] = useState<DishFormState>(() => createEmptyForm())
  const [categories, setCategories] = useState<Category[]>([])
  const [dishList, setDishList] = useState<ManagedDish[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const skipNextDidShowSyncRef = useRef(false)

  const user = getUser()
  const modalMaskStyle = useMemo(() => getModalMaskStyle(), [])
  const previewImageUrl = form.localImagePath || form.remoteImageUrl
  const modalTitle = modalMode === 'edit' ? '编辑菜品' : '添加首页菜品'
  const modalSubmitText = submitting
    ? '提交中...'
    : modalMode === 'edit'
      ? '保存修改'
      : '确认添加'
  const modalDesc =
    modalMode === 'edit'
      ? '修改后会同步更新首页点单页展示的菜品信息'
      : '选择分类并填写菜名和描述，添加后会同步展示到首页'

  const updateForm = (patch: Partial<DishFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  const resetForm = (categoryId = categories[0]?.id || '') => {
    setForm(createEmptyForm(categoryId))
    setEditingDishId('')
    setModalMode('create')
  }

  const closeModal = () => {
    resetForm(categories[0]?.id || '')
    setShowModal(false)
  }

  const loadManagedDishes = async () => {
    const [categoryList, managedDishes] = await Promise.all([
      getCategories(),
      getManagedDishes()
    ])

    setCategories(categoryList)
    setDishList(managedDishes)
    setForm((prev) => {
      if (prev.categoryId) {
        return prev
      }

      return {
        ...prev,
        categoryId: categoryList[0]?.id || ''
      }
    })
  }

  const syncPage = async (showPageLoading = true) => {
    if (showPageLoading) {
      setLoading(true)
    }

    try {
      await checkAuth()
      await loadManagedDishes()
    } catch (error) {
      console.error('sync profile failed:', error)

      if (!hasToken()) {
        setCategories([])
        setDishList([])
        return
      }

      try {
        await loadManagedDishes()
      } catch (loadError) {
        console.error('load dishes failed:', loadError)
        Taro.showToast({ title: '加载失败', icon: 'none' })
      }
    } finally {
      if (showPageLoading) {
        setLoading(false)
      }
    }
  }

  useDidShow(() => {
    const shouldShowPageLoading = !showModal && !skipNextDidShowSyncRef.current

    if (skipNextDidShowSyncRef.current) {
      skipNextDidShowSyncRef.current = false
    }

    void syncPage(shouldShowPageLoading)
  })

  const openCreateModal = () => {
    if (!categories.length) {
      Taro.showToast({ title: '暂无可用分类', icon: 'none' })
      return
    }

    resetForm(categories[0]?.id || '')
    setShowModal(true)
  }

  const openEditModal = (dish: ManagedDish) => {
    setModalMode('edit')
    setEditingDishId(dish.id)
    setForm({
      name: dish.name || '',
      description: dish.description || '',
      categoryId: dish.category_id || categories[0]?.id || '',
      localImagePath: '',
      remoteImageUrl: dish.image_url || ''
    })
    setShowModal(true)
  }

  const handleChooseImage = async () => {
    try {
      skipNextDidShowSyncRef.current = true
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      const nextImage = res.tempFilePaths[0] || ''
      const nextFile = res.tempFiles?.[0] as { size?: number } | undefined

      if (!nextImage) {
        return
      }

      if ((nextFile?.size || 0) > MAX_IMAGE_SIZE) {
        Taro.showToast({ title: '图片不能超过 5MB', icon: 'none' })
        return
      }

      updateForm({ localImagePath: nextImage })
    } catch (error) {
      if ((error as { errMsg?: string })?.errMsg?.includes('cancel')) {
        return
      }

      Taro.showToast({ title: '选择图片失败', icon: 'none' })
    }
  }

  const handlePreviewImage = (imageUrl = previewImageUrl) => {
    if (!imageUrl) {
      return
    }

    void Taro.previewImage({
      current: imageUrl,
      urls: [imageUrl]
    })
  }

  const handleRemoveLocalImage = () => {
    updateForm({ localImagePath: '' })
  }

  const resolveImageUrlForSubmit = async () => {
    if (!form.localImagePath) {
      return undefined
    }

    Taro.showLoading({ title: '上传图片中...', mask: true })
    const uploadResult = await uploadImage(form.localImagePath)
    return uploadResult.url
  }

  const handleSubmitDish = async () => {
    if (submitting) {
      return
    }

    const trimmedName = form.name.trim()
    const trimmedDescription = form.description.trim()

    if (!trimmedName) {
      Taro.showToast({ title: '请输入菜名', icon: 'none' })
      return
    }

    if (!form.categoryId) {
      Taro.showToast({ title: '请选择分类', icon: 'none' })
      return
    }

    try {
      setSubmitting(true)
      Taro.showLoading({
        title: modalMode === 'edit' ? '保存中...' : '添加中...',
        mask: true
      })

      const imageUrl = await resolveImageUrlForSubmit()

      Taro.showLoading({
        title: modalMode === 'edit' ? '保存中...' : '添加中...',
        mask: true
      })

      const payload = {
        category_id: form.categoryId,
        name: trimmedName,
        description: trimmedDescription || undefined,
        ...(imageUrl ? { image_url: imageUrl } : {})
      }

      if (modalMode === 'edit' && editingDishId) {
        await updateManagedDish(editingDishId, payload)
      } else {
        await createManagedDish(payload)
      }

      closeModal()
      await loadManagedDishes()
      Taro.showToast({
        title: modalMode === 'edit' ? '修改成功' : '添加成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('submit dish failed:', error)
      Taro.showToast({
        title: getErrorMessage(
          error,
          modalMode === 'edit' ? '修改失败' : '添加失败'
        ),
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
      Taro.hideLoading()
    }
  }

  const handleDeleteDish = async (id: string) => {
    const res = await Taro.showModal({
      title: '删除菜品',
      content: '删除后首页点单页也会同步移除，确认删除吗？',
      confirmColor: '#e26d5a'
    })

    if (!res.confirm) {
      return
    }

    try {
      Taro.showLoading({ title: '删除中...', mask: true })
      await deleteManagedDish(id)
      await loadManagedDishes()
      Taro.showToast({ title: '删除成功', icon: 'success' })
    } catch (error) {
      console.error('delete dish failed:', error)
      Taro.showToast({
        title: getErrorMessage(error, '删除失败'),
        icon: 'none'
      })
    } finally {
      Taro.hideLoading()
    }
  }

  const handleLogout = async () => {
    const res = await Taro.showModal({
      title: '退出登录',
      content: '退出后需要重新登录，确认退出吗？',
      confirmColor: '#d86c5b'
    })

    if (!res.confirm) {
      return
    }

    try {
      Taro.showLoading({ title: '退出中...', mask: true })
      await logout()
      await Taro.reLaunch({ url: '/pages/login/index' })
    } catch (error) {
      console.error('logout failed:', error)
      Taro.showToast({ title: '退出失败', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  if (loading) {
    return (
      <PageShell title='我的' subtitle='账号信息与菜品管理'>
        <View className='loading-container'>
          <Text className='loading-text'>加载中...</Text>
        </View>
      </PageShell>
    )
  }

  return (
    <>
      <PageShell title='我的' subtitle='账号信息与菜品管理'>
        <View className='profile-role'>
          <Text className='profile-role__label'>当前身份</Text>
          <Text
            className={`profile-role__tag ${
              user?.role === 'chef'
                ? 'profile-role__tag--chef'
                : 'profile-role__tag--customer'
            }`}
          >
            {user?.role === 'chef' ? '管理员' : '普通用户'}
          </Text>
        </View>

        <View className='wish-entry card'>
          <View className='wish-entry__left'>
            <View className='wish-entry__icon'>菜</View>
            <View>
              <Text className='wish-entry__title'>菜品管理</Text>
              <Text className='wish-entry__desc'>
                新增、编辑或删除首页展示的菜品
              </Text>
            </View>
          </View>
          <Text className='accent-btn' onClick={openCreateModal}>
            + 添加
          </Text>
        </View>

        <Text className='profile-section-title'>已管理菜品 ({dishList.length})</Text>

        {dishList.length === 0 ? (
          <View className='wish-empty card'>
            <Text className='wish-empty__heart'>菜</Text>
            <Text className='wish-empty__title'>还没有添加展示菜品</Text>
            <Text className='wish-empty__desc'>
              添加后首页点单页就能看到它们
            </Text>
          </View>
        ) : (
          <View className='wish-list'>
            {dishList.map((dish) => (
              <View className='wish-item card' key={dish.id}>
                {dish.image_url ? (
                  <Image
                    className='wish-item__image'
                    mode='aspectFill'
                    src={dish.image_url}
                    onClick={() => handlePreviewImage(dish.image_url)}
                  />
                ) : (
                  <View className='wish-item__image wish-item__image--placeholder'>
                    暂无图片
                  </View>
                )}

                <View className='wish-item__content'>
                  <View className='wish-item__meta'>
                    <Text className='wish-item__name'>{dish.name}</Text>
                  </View>

                  <View className='wish-item__tags'>
                    <Text className='wish-item__tag'>
                      {dish.category?.name || '未分类'}
                    </Text>
                    {dish.tag ? (
                      <Text className='wish-item__tag wish-item__tag--accent'>
                        {dish.tag}
                      </Text>
                    ) : null}
                  </View>

                  {dish.description ? (
                    <Text className='wish-item__note'>{dish.description}</Text>
                  ) : (
                    <Text className='wish-item__note wish-item__note--muted'>
                      暂无描述
                    </Text>
                  )}
                </View>

                <View className='wish-item__actions'>
                  <Text
                    className='wish-item__action'
                    onClick={() => openEditModal(dish)}
                  >
                    编辑
                  </Text>
                  <Text
                    className='wish-item__action wish-item__action--danger'
                    onClick={() => void handleDeleteDish(dish.id)}
                  >
                    删除
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className='profile-logout-wrap'>
          <Text className='profile-logout' onClick={() => void handleLogout()}>
            退出登录
          </Text>
        </View>

        {showModal ? (
          <View
            className='wish-modal-mask'
            style={modalMaskStyle}
            onClick={closeModal}
          >
            <View className='wish-modal card' onClick={(e) => e.stopPropagation()}>
              <View className='wish-modal__head'>
                <Text className='wish-modal__title'>{modalTitle}</Text>
                <Text className='wish-modal__close' onClick={closeModal}>
                  ×
                </Text>
              </View>

              <Text className='wish-modal__desc'>{modalDesc}</Text>

              <View
                className={`wish-modal__upload ${previewImageUrl ? 'wish-modal__upload--filled' : ''}`}
                onClick={() => {
                  if (!previewImageUrl) {
                    void handleChooseImage()
                  }
                }}
              >
                {previewImageUrl ? (
                  <>
                    <Image
                      className='wish-modal__preview-image'
                      src={previewImageUrl}
                      mode='aspectFill'
                    />
                    <View className='wish-modal__preview-actions'>
                      <Text
                        className='wish-modal__preview-btn'
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleChooseImage()
                        }}
                      >
                        重新选择
                      </Text>
                      {form.localImagePath ? (
                        <Text
                          className='wish-modal__preview-btn wish-modal__preview-btn--danger'
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveLocalImage()
                          }}
                        >
                          移除
                        </Text>
                      ) : (
                        <Text
                          className='wish-modal__preview-btn'
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePreviewImage()
                          }}
                        >
                          查看大图
                        </Text>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    <Text className='wish-modal__upload-icon'>图</Text>
                    <Text className='wish-modal__upload-text'>点击选择图片</Text>
                    <Text className='wish-modal__upload-tip'>
                      支持 JPG、PNG 等图片，单张图片最大 5MB
                    </Text>
                  </>
                )}
              </View>

              <Text className='wish-modal__label'>分类 *</Text>
              <View className='wish-modal__category-list'>
                {categories.map((category) => (
                  <Text
                    className={`wish-modal__category ${form.categoryId === category.id ? 'wish-modal__category--active' : ''}`}
                    key={category.id}
                    onClick={() => updateForm({ categoryId: category.id })}
                  >
                    {category.name}
                  </Text>
                ))}
              </View>

              <Text className='wish-modal__label'>菜名 *</Text>
              <Input
                className='wish-modal__input'
                placeholder='例如：红烧肉'
                placeholderClass='wish-modal__placeholder'
                placeholderStyle='color:#7b8495;'
                value={form.name}
                onInput={(e) => updateForm({ name: e.detail.value })}
              />

              <Text className='wish-modal__label'>描述</Text>
              <Textarea
                className='wish-modal__textarea'
                placeholder='例如：微辣，适合下饭'
                placeholderClass='wish-modal__placeholder'
                placeholderStyle='color:#7b8495;'
                value={form.description}
                onInput={(e) => updateForm({ description: e.detail.value })}
              />

              <Text
                className='wish-modal__submit'
                onClick={() => {
                  void handleSubmitDish()
                }}
              >
                {modalSubmitText}
              </Text>
            </View>
          </View>
        ) : null}
      </PageShell>
      <GlobalAssistant />
    </>
  )
}
